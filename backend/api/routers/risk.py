from fastapi import APIRouter, Depends, Body, HTTPException
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.db.models import RiskCheck
from backend.api.deps import get_optional_user
from backend.services import risk_service
import os, json

router = APIRouter(prefix="/risk", tags=["risk"])

@router.post("/check")
def check(body: dict = Body(...), db: Session = Depends(get_db), user=Depends(get_optional_user)):
    orders = body.get("orders")
    # Support single order or list
    if not orders:
        # Try to read trader/orders.json
        orders_path = "trader/orders.json"
        if os.path.exists(orders_path):
            try:
                with open(orders_path, encoding="utf-8") as fh:
                    data = json.load(fh)
                orders = data.get("orders") if isinstance(data, dict) and "orders" in data else ([data] if isinstance(data, dict) else data)
            except: pass
        if not orders:
            raise HTTPException(status_code=400, detail="No orders to check")
    if isinstance(orders, dict):
        orders = [orders]
    # Build cfg from body or file
    cfg = body.get("config", {})
    if not cfg or len(cfg) < 3:
        cfg_path = "trader/config.json"
        if os.path.exists(cfg_path):
            try:
                with open(cfg_path, encoding="utf-8") as fh:
                    file_cfg = json.load(fh)
                # Merge
                for k, v in file_cfg.items():
                    if k not in cfg:
                        cfg[k] = v
            except: pass
        # Apply defaults
        defaults = {"budget": 5000, "cash_buffer_pct": 10, "max_position_pct": 75, "max_order_usd": 4000, "min_order_usd": 5, "max_loss_per_trade_usd": 50, "max_daily_loss_usd": 150, "max_trades_per_day": 3, "max_orders_per_day": 10, "min_reward_risk": 1.0, "require_stop": True, "no_entries_before": "09:45", "no_entries_after": "15:30", "flat_by": "15:55", "pdt_guard": False, "allow_options": False, "allow_margin": False, "allow_short": False, "paper": True, "blocked": []}
        for k, v in defaults.items():
            if k not in cfg:
                cfg[k] = v

    # Load portfolio/prices/state from files if not provided
    portfolio = body.get("portfolio")
    prices = body.get("prices")
    state = body.get("state")
    # Try files
    for key, path, target in [("portfolio", "trader/portfolio.json", "portfolio"), ("prices", "trader/prices.json", "prices"), ("state", "trader/state/broker.json", "state")]:
        if locals()[target] is None and os.path.exists(path):
            try:
                with open(path, encoding="utf-8") as fh:
                    locals()[target] = json.load(fh)
            except: pass
    # For API we pass dicts; if still None, let check handle Nones (it will try files itself)
    # Use direct function with dicts where available
    result = risk_service.check_orders(orders, cfg, portfolio=portfolio, prices=prices, state=state)

    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result.get("error"))

    # Save each check
    for r in result.get("results", []):
        try:
            rc = RiskCheck(
                user_id=user.id if user else None,
                status=r.get("status"),
                reason="; ".join(r.get("reasons", [])) if r.get("reasons") else None,
                raw=r
            )
            db.add(rc)
        except: pass
    try:
        db.commit()
    except: pass

    # Also write trader/state/risk.json for broker flow
    try:
        import datetime
        os.makedirs("trader/state", exist_ok=True)
        today = body.get("today") or __import__("datetime").date.today().isoformat()
        risk_doc = {"date": today, "checks": result.get("results", []), "allPass": result.get("allPass", False)}
        with open("trader/state/risk.json", "w", encoding="utf-8") as fh:
            json.dump(risk_doc, fh, indent=2)
    except: pass

    # Determine overall PASS/BLOCK
    overall = "PASS" if result.get("allPass") else "BLOCK"
    # Build exact BLOCK reasons
    block_reasons = []
    for r in result.get("results", []):
        if r.get("status") == "BLOCK":
            block_reasons.extend(r.get("reasons", []))
    return {
        "status": overall,
        "allPass": result.get("allPass", False),
        "results": result.get("results", []),
        "reasons": block_reasons,
        "message": "PASS" if overall=="PASS" else f"BLOCKED: {'; '.join(block_reasons) if block_reasons else 'Risk limit exceeded'}",
    }

@router.get("/check")
def get_last_check(db: Session = Depends(get_db), user=Depends(get_optional_user)):
    q = db.query(RiskCheck)
    if user:
        q = q.filter(RiskCheck.user_id == user.id)
    checks = q.order_by(RiskCheck.created_at.desc()).limit(10).all()
    return [{"id": c.id, "status": c.status, "reason": c.reason, "raw": c.raw, "createdAt": c.created_at.isoformat() if c.created_at else None} for c in checks]
