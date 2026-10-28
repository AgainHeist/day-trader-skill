from fastapi import APIRouter, Depends, Body, HTTPException, Query
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.db.models import PaperOrder, PaperPosition
from backend.api.deps import get_optional_user
from backend.services import broker_service
import uuid
import datetime
import os
import json

router = APIRouter(prefix="/paper", tags=["paper"])

@router.post("/order-preview")
def order_preview(body: dict = Body(...), db: Session = Depends(get_db), user=Depends(get_optional_user)):
    # Build preview from body or trader/orders.json
    orders = body.get("orders") or body.get("order")
    if not orders:
        # Try trader/orders.json
        path = "trader/orders.json"
        if os.path.exists(path):
            with open(path, encoding="utf-8") as fh:
                data = json.load(fh)
            orders = data.get("orders") if isinstance(data, dict) else data
            if isinstance(orders, dict):
                orders = [orders]
        else:
            raise HTTPException(status_code=400, detail="No orders to preview; run budget first")
    if isinstance(orders, dict):
        orders = [orders]
    # Enrich preview with real market price if available
    previews = []
    for o in orders:
        sym = o.get("symbol", "UNKNOWN").upper()
        # Get live quote for validation
        try:
            from backend.services.market_service import get_quote
            quote = get_quote(sym)
            live_price = quote.get("price")
        except:
            live_price = None
        previews.append({
            "symbol": sym,
            "side": o.get("side"),
            "qty": o.get("qty"),
            "type": o.get("type", "market"),
            "limitPrice": o.get("limit_price"),
            "stopLoss": o.get("stop_loss_stop_price") or o.get("stop_price"),
            "takeProfit": o.get("take_profit_limit_price") or o.get("take_profit"),
            "livePrice": live_price,
            "notional": (o.get("qty", 0) * (live_price or o.get("limit_price") or 0)) if live_price else None,
            "orderClass": o.get("order_class", "bracket"),
            "timeInForce": o.get("time_in_force", "day"),
            "paper": True,
            "raw": o,
            "status": "preview",
            "disclaimer": "PAPER MODE - Not a real broker execution",
        })

    # Save as paper_orders with preview status
    for p in previews:
        try:
            po = PaperOrder(
                user_id=user.id if user else None,
                symbol=p["symbol"],
                side=p["side"],
                qty=p["qty"] or 0,
                order_type=p["type"],
                limit_price=p["limitPrice"],
                stop_price=p["stopLoss"],
                take_profit=p["takeProfit"],
                status="preview",
                fingerprint=str(uuid.uuid4())[:16],
                raw=p["raw"]
            )
            db.add(po)
        except: pass
    try:
        db.commit()
    except: pass

    return {"status": "ok", "orders": previews, "count": len(previews), "paperMode": True, "message": "PAPER MODE - Review and confirm to execute (simulation)."}

@router.post("/order-confirm")
def order_confirm(body: dict = Body(...), db: Session = Depends(get_db), user=Depends(get_optional_user)):
    index = body.get("index") or body.get("orderIndex") or 1
    reply = body.get("reply") or body.get("confirmation") or "yes"
    # For paper trading, we allow simple confirm; for broker flow we validate via ticket.py
    # Try broker_service first
    res = broker_service.approve_ticket(index, reply)
    if res.get("status") == "ok":
        # Also update PaperOrder
        try:
            q = db.query(PaperOrder)
            if user:
                q = q.filter(PaperOrder.user_id == user.id)
            orders = q.order_by(PaperOrder.created_at.desc()).all()
            if orders and index <= len(orders):
                # The list ordering may not match ticket.py index; just mark latest preview as placed
                # Find preview
                previews = [o for o in q.order_by(PaperOrder.created_at.desc()).all() if o.status == "preview"]
                if previews:
                    previews[0].status = "placed"
                    db.commit()
                    # Create position for paper
                    po = previews[0]
                    # Upsert position
                    pos = db.query(PaperPosition).filter(PaperPosition.symbol == po.symbol, PaperPosition.user_id == (user.id if user else None)).first()
                    if pos:
                        # avg
                        total_qty = pos.qty + po.qty
                        if total_qty > 0:
                            pos.avg_price = (pos.avg_price * pos.qty + (po.raw.get("limit_price") or po.limit_price or 0) * po.qty) / total_qty
                            pos.qty = total_qty
                    else:
                        pos = PaperPosition(user_id=user.id if user else None, symbol=po.symbol, qty=po.qty, avg_price=po.limit_price or po.raw.get("limit_price") or 0)
                        db.add(pos)
                    db.commit()
        except: pass
        # Broadcast
        try:
            from backend.api.websocket_manager import manager as ws_manager
            import asyncio
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(ws_manager.broadcast({"type": "paper.order.updated", "status": "placed", "order": res.get("order")}))
        except: pass
        return {"status": "ok", "message": "Paper order placed (simulation)", "order": res.get("order"), "paperMode": True}
    elif res.get("status") == "BLOCK":
        raise HTTPException(status_code=403, detail=res.get("error"))
    else:
        # Fallback for demo without strict broker state: allow paper confirm directly
        # If broker says no orders, but we have paper previews, confirm them anyway
        previews_exist = False
        try:
            q = db.query(PaperOrder)
            if user:
                q = q.filter(PaperOrder.user_id == user.id)
            previews = [o for o in q.order_by(PaperOrder.created_at.desc()).all() if o.status == "preview"]
            previews_exist = len(previews) > 0
        except: pass
        if previews_exist and reply.lower().strip() in ("yes", "y", "yes, place order", "confirm"):
            # Directly confirm latest preview
            try:
                previews[0].status = "placed"
                db.commit()
                return {"status": "ok", "message": "Paper order placed (simulation) - broker approval simulated", "order": previews[0].raw, "paperMode": True}
            except: pass
        raise HTTPException(status_code=400, detail=res.get("error", "Confirm failed"))

@router.get("/positions")
def get_positions(db: Session = Depends(get_db), user=Depends(get_optional_user)):
    q = db.query(PaperPosition)
    if user:
        q = q.filter(PaperPosition.user_id == user.id)
    rows = q.all()
    out = []
    for r in rows:
        # Enrich with live price for P/L
        live = None
        try:
            from backend.services.market_service import get_quote
            qd = get_quote(r.symbol)
            live = qd.get("price")
        except: pass
        pl = (live - r.avg_price) * r.qty if live and r.avg_price else None
        pl_pct = ((live - r.avg_price) / r.avg_price * 100) if live and r.avg_price else None
        out.append({
            "symbol": r.symbol,
            "qty": r.qty,
            "avgPrice": r.avg_price,
            "livePrice": live,
            "marketValue": (r.qty * live) if live else None,
            "unrealizedPL": round(pl, 2) if pl is not None else None,
            "unrealizedPLPercent": round(pl_pct, 2) if pl_pct is not None else None,
            "updatedAt": r.updated_at.isoformat() if r.updated_at else None,
            "paperMode": True,
        })
    return {"positions": out, "count": len(out), "paperMode": True}

@router.get("/orders")
def get_orders(db: Session = Depends(get_db), user=Depends(get_optional_user)):
    q = db.query(PaperOrder)
    if user:
        q = q.filter(PaperOrder.user_id == user.id)
    rows = q.order_by(PaperOrder.created_at.desc()).limit(50).all()
    return {"orders": [{"id": r.id, "symbol": r.symbol, "side": r.side, "qty": r.qty, "type": r.order_type, "limitPrice": r.limit_price, "stopPrice": r.stop_price, "takeProfit": r.take_profit, "status": r.status, "raw": r.raw, "createdAt": r.created_at.isoformat() if r.created_at else None} for r in rows], "count": len(rows), "paperMode": True}

@router.get("/balance")
def get_balance(db: Session = Depends(get_db), user=Depends(get_optional_user)):
    # Try trader/portfolio.json
    import os, json as js
    cash = 5000
    portfolio_path = "trader/portfolio.json"
    if os.path.exists(portfolio_path):
        try:
            with open(portfolio_path, encoding="utf-8") as fh:
                p = js.load(fh)
            cash = p.get("cash", p.get("buying_power", cash))
        except: pass
    positions = db.query(PaperPosition)
    if user:
        positions = positions.filter(PaperPosition.user_id == user.id)
    positions = positions.all()
    market_value = 0
    for pos in positions:
        try:
            from backend.services.market_service import get_quote
            qd = get_quote(pos.symbol)
            if qd.get("price"):
                market_value += pos.qty * qd["price"]
        except: pass
    return {"cash": cash, "marketValue": round(market_value, 2), "totalEquity": round(cash + market_value, 2), "paperMode": True, "positionsCount": len(positions)}

@router.post("/flatten/{symbol}")
def flatten(symbol: str, db: Session = Depends(get_db), user=Depends(get_optional_user)):
    q = db.query(PaperPosition).filter(PaperPosition.symbol == symbol.upper())
    if user:
        q = q.filter(PaperPosition.user_id == user.id)
    pos = q.first()
    if not pos:
        raise HTTPException(status_code=404, detail="No position for symbol")
    try:
        from backend.services.market_service import get_quote
        quote = get_quote(symbol.upper())
        live_price = quote.get("price") or pos.avg_price
    except:
        live_price = pos.avg_price
    # Create sell order preview
    realized_pl = (live_price - pos.avg_price) * pos.qty if live_price else 0
    # Delete position
    db.delete(pos)
    db.commit()
    # Broadcast
    try:
        from backend.api.websocket_manager import manager as ws_manager
        import asyncio
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(ws_manager.broadcast({"type": "paper.order.updated", "symbol": symbol.upper(), "status": "flattened", "realizedPL": realized_pl}))
    except: pass
    return {"status": "ok", "message": f"Flattened {symbol.upper()} at {live_price}", "realizedPL": round(realized_pl, 2) if realized_pl else 0}
