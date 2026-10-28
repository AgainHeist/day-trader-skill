from fastapi import APIRouter, Depends, Body, HTTPException
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.db.models import BudgetCalc
from backend.api.deps import get_optional_user
from backend.services import budget_service
import os, json

router = APIRouter(prefix="/budget", tags=["budget"])

@router.post("/calculate")
def calculate(body: dict = Body(...), db: Session = Depends(get_db), user=Depends(get_optional_user)):
    # Supports two modes: from plan.json or explicit
    accountSize = body.get("accountSize") or body.get("budget") or body.get("account_size")
    maxRisk = body.get("maxRiskPerTrade") or body.get("maxRisk") or body.get("max_loss_per_trade_usd")
    stopDistance = body.get("stopDistance")
    plan = body.get("plan")
    symbol = body.get("symbol")
    # If plan not provided, try trader/plan.json
    if not plan:
        plan_path = "trader/plan.json"
        if os.path.exists(plan_path):
            try:
                with open(plan_path, encoding="utf-8") as fh:
                    plan = json.load(fh)
            except: pass
        elif body.get("entry") and body.get("stop"):
            plan = {
                "symbol": symbol or body.get("symbol", "TSLA"),
                "entry": body.get("entry"),
                "stop": body.get("stop"),
                "target": body.get("target"),
                "risk_per_share": (body.get("entry") - body.get("stop")) if body.get("entry") and body.get("stop") else None,
                "date": body.get("date", "2026-10-19"),
                "setup": body.get("setup", "orb"),
            }

    if not plan:
        raise HTTPException(status_code=400, detail="Plan required: provide plan or entry/stop")

    # Build config from body or default
    cfg = {
        "budget": accountSize or 5000,
        "max_loss_per_trade_usd": maxRisk or 50,
        "max_position_pct": body.get("maxPositionPct", 75),
        "max_order_usd": body.get("maxOrderUsd", 4000),
        "min_order_usd": body.get("minOrderUsd", 5),
        "cash_buffer_pct": body.get("cashBufferPct", 10),
        "fractional": body.get("fractional", False),
        "blocked": body.get("blocked", []),
    }
    # Allow full config override
    if body.get("config"):
        cfg.update(body.get("config"))
    # Load trader/config.json if exists to get defaults
    cfg_path = "trader/config.json"
    if os.path.exists(cfg_path):
        try:
            with open(cfg_path, encoding="utf-8") as fh:
                file_cfg = json.load(fh)
            for k, v in file_cfg.items():
                if k not in cfg or cfg[k] is None:
                    cfg[k] = v
        except: pass

    result = budget_service.calculate_with_config(plan, cfg, budget_override=accountSize)
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("error"))

    # Extract calculated values
    res = result.get("result", {})
    order = result.get("order")
    shares = res.get("shares") if isinstance(res, dict) else None
    if isinstance(res, dict) and "qty" in res:
        shares = res.get("qty")
    # Fallback parse order
    if order and not shares:
        shares = order.get("qty", shares)
    try:
        shares = int(shares) if shares is not None else 0
    except:
        try:
            shares = int(float(shares))
        except:
            shares = 0
    price = plan.get("entry") if isinstance(plan, dict) else 0

    try:
        entry_price = float(plan.get("entry", 0) or 0) if isinstance(plan, dict) else 0
    except:
        entry_price = 0
    try:
        risk_per_share = float(plan.get("risk_per_share") or (plan.get("entry",0)-plan.get("stop",0)) if isinstance(plan, dict) and plan.get("entry") and plan.get("stop") else 0)
    except:
        risk_per_share = 0
    total_value = (shares or 0) * entry_price if shares and entry_price else 0
    max_loss = (shares or 0) * risk_per_share if shares and risk_per_share else 0

    # Save to DB - backend must calculate, never trust frontend size
    try:
        calc = BudgetCalc(
            user_id=user.id if user else None,
            symbol=plan.get("symbol", "UNKNOWN"),
            shares=shares or 0,
            position_value=total_value,
            max_loss=max_loss,
            status="ok",
            raw={"plan": plan, "config": cfg, "result": res, "order": order, "shares": shares, "totalValue": total_value, "maxLoss": max_loss}
        )
        db.add(calc)
        db.commit()
        db.refresh(calc)
        calc_id = calc.id
    except:
        calc_id = None

    # Also write orders.json for risk checker
    if order:
        try:
            os.makedirs("trader", exist_ok=True)
            # Write in expected format: {orders: [order]}
            # Also handle existing orders.json append?
            orders_path = "trader/orders.json"
            # For single-trade mode, write single order
            with open(orders_path, "w", encoding="utf-8") as fh:
                json.dump({"orders": [order]}, fh, indent=2)
        except: pass

    return {
        "shares": shares,
        "totalValue": round(total_value, 2) if total_value else 0,
        "maxLoss": round(max_loss, 2) if max_loss else 0,
        "positionSize": shares,
        "positionValue": round(total_value, 2),
        "entry": plan.get("entry"),
        "stop": plan.get("stop"),
        "riskPerShare": plan.get("risk_per_share") or (plan.get("entry")-plan.get("stop") if plan.get("entry") and plan.get("stop") else 0),
        "order": order,
        "budgetStatus": "ok" if shares and shares > 0 else "no_shares",
        "calculationId": calc_id,
        "raw": res,
    }

@router.get("/calculate/{symbol}")
def get_calculation(symbol: str, db: Session = Depends(get_db), user=Depends(get_optional_user)):
    q = db.query(BudgetCalc).filter(BudgetCalc.symbol == symbol.upper())
    if user:
        q = q.filter(BudgetCalc.user_id == user.id)
    calc = q.order_by(BudgetCalc.created_at.desc()).first()
    if not calc:
        raise HTTPException(status_code=404, detail="No calculation for symbol")
    return {"symbol": calc.symbol, "shares": calc.shares, "positionValue": calc.position_value, "maxLoss": calc.max_loss, "status": calc.status, "raw": calc.raw}

@router.get("/")
def list_calcs(db: Session = Depends(get_db), user=Depends(get_optional_user)):
    q = db.query(BudgetCalc)
    if user:
        q = q.filter(BudgetCalc.user_id == user.id)
    rows = q.order_by(BudgetCalc.created_at.desc()).limit(20).all()
    return [{"id": r.id, "symbol": r.symbol, "shares": r.shares, "value": r.position_value, "maxLoss": r.max_loss, "createdAt": r.created_at.isoformat() if r.created_at else None} for r in rows]
