from fastapi import APIRouter, Depends, Body, HTTPException, Query, Path
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.db.models import Alert, AlertEvent
from backend.api.deps import get_optional_user
from backend.services import alerts_service
from backend.api.websocket_manager import manager as ws_manager
import json
import datetime

router = APIRouter(prefix="/alerts", tags=["alerts"])

@router.get("/")
def list_alerts(db: Session = Depends(get_db), user=Depends(get_optional_user)):
    q = db.query(Alert)
    if user:
        q = q.filter(Alert.user_id == user.id)
    rows = q.order_by(Alert.created_at.desc()).limit(100).all()
    return [{"id": r.id, "symbol": r.symbol, "ruleType": r.rule_type, "price": r.price, "pct": r.pct, "atTime": r.at_time, "label": r.label, "triggered": r.triggered, "triggeredAt": r.triggered_at.isoformat() if r.triggered_at else None, "raw": r.raw, "createdAt": r.created_at.isoformat() if r.created_at else None} for r in rows]

@router.post("/")
def create_alert(body: dict = Body(...), db: Session = Depends(get_db), user=Depends(get_optional_user)):
    symbol = body.get("symbol")
    rule_type = body.get("ruleType") or body.get("type") or body.get("rule_type")
    price = body.get("price")
    pct = body.get("pct")
    at_time = body.get("at") or body.get("atTime")
    label = body.get("label") or ""
    before_close = body.get("beforeClose") or body.get("before_close")
    opening_bell = body.get("openingBell") or body.get("opening_bell")

    # Support from-plan shortcut
    if body.get("fromPlan") or body.get("from_plan"):
        # Auto-create stop/target/flat from trader/plan.json
        import os, json as js
        plan_path = "trader/plan.json"
        if not os.path.exists(plan_path):
            raise HTTPException(status_code=400, detail="No plan found for fromPlan")
        with open(plan_path, encoding="utf-8") as fh:
            plan = js.load(fh)
        alerts = []
        for rule_type_, price_, label_ in [
            ("below", plan.get("stop"), f"{plan.get('symbol')} stop"),
            ("above", plan.get("target"), f"{plan.get('symbol')} target"),
            ("time", None, "flat by close"),
        ]:
            if rule_type_ == "time":
                rule = {"type": "time", "at": plan.get("flat_by", "15:55"), "label": label_, "before_close": True}
            else:
                if not price_:
                    continue
                rule = {"symbol": plan.get("symbol"), "type": rule_type_, "price": price_, "label": label_, "date": plan.get("date")}
            # Avoid duplicates: check if similar already exists
            al = Alert(user_id=user.id if user else None, symbol=rule.get("symbol"), rule_type=rule["type"], price=rule.get("price"), at_time=rule.get("at"), label=rule.get("label"), raw=rule)
            db.add(al)
            alerts.append(rule)
        db.commit()
        # Broadcast
        try:
            import asyncio
            loop = asyncio.get_event_loop()
            for a in alerts:
                if loop.is_running():
                    loop.create_task(ws_manager.broadcast({"type": "alert.created", "data": a}))
        except: pass
        return {"status": "ok", "alerts": alerts, "count": len(alerts)}

    if not rule_type:
        # Infer from body
        if price and body.get("side") == "stop":
            rule_type = "below"
            if not symbol and body.get("stop"):
                price = body.get("stop")
        elif body.get("stop"):
            rule_type = "below"
            price = body.get("stop")
            symbol = symbol or body.get("symbol")
        elif body.get("target"):
            rule_type = "above"
            price = body.get("target")
            symbol = symbol or body.get("symbol")
        else:
            raise HTTPException(status_code=400, detail="ruleType required: above, below, pct_move, time, opening_bell")

    if rule_type == "opening_bell" or opening_bell:
        rule = {"type": "opening_bell", "label": label or "opening bell"}
    elif rule_type == "time":
        if not at_time:
            raise HTTPException(status_code=400, detail="at time required for time alert")
        rule = {"type": "time", "at": at_time, "label": label, "before_close": bool(before_close)}
    elif rule_type in ("above", "target"):
        if not symbol or price is None:
            raise HTTPException(status_code=400, detail="symbol and price required for above/target alert")
        rule = {"symbol": symbol.upper(), "type": "above", "price": float(price), "label": label}
    elif rule_type in ("below", "stop"):
        if not symbol or price is None:
            raise HTTPException(status_code=400, detail="symbol and price required for below/stop alert")
        rule = {"symbol": symbol.upper(), "type": "below", "price": float(price), "label": label}
    elif rule_type == "pct_move":
        if not symbol or pct is None:
            raise HTTPException(status_code=400, detail="symbol and pct required for pct_move")
        rule = {"symbol": symbol.upper(), "type": "pct_move", "pct": float(pct), "label": label, "direction": body.get("direction")}
    else:
        raise HTTPException(status_code=400, detail=f"Unknown ruleType: {rule_type}")

    # Validate via service
    val = alerts_service.add_alert(rule)
    if val.get("status") == "error":
        raise HTTPException(status_code=400, detail=val.get("error"))

    # Save to DB
    alert = Alert(
        user_id=user.id if user else None,
        symbol=rule.get("symbol"),
        rule_type=rule.get("type"),
        price=rule.get("price"),
        pct=rule.get("pct"),
        at_time=rule.get("at"),
        label=rule.get("label", ""),
        raw=rule,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    try:
        import asyncio
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(ws_manager.broadcast({"type": "alert.created", "data": rule, "alertId": alert.id}))
    except: pass
    return {"status": "ok", "alert": rule, "alertId": alert.id}

@router.delete("/{alert_id}")
def delete_alert(alert_id: int, db: Session = Depends(get_db), user=Depends(get_optional_user)):
    q = db.query(Alert).filter(Alert.id == alert_id)
    if user:
        q = q.filter(Alert.user_id == user.id)
    row = q.first()
    if not row:
        raise HTTPException(status_code=404, detail="Alert not found")
    db.delete(row)
    db.commit()
    return {"status": "ok", "deleted": alert_id}

@router.post("/check")
def check_triggers(body: dict = Body(None)):
    now = body.get("now") if body and isinstance(body, dict) else None
    offline = body.get("offline") if body and isinstance(body, dict) else None
    res = alerts_service.check_alerts(now=now, offline=offline)
    return res
