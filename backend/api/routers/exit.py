from fastapi import APIRouter, Depends, Body, HTTPException, Query
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.db.models import ExitPlan
from backend.api.deps import get_optional_user
from backend.services import exit_service
import json

router = APIRouter(prefix="/exit", tags=["exit"])

@router.post("/plan")
def create_plan(body: dict = Body(...), db: Session = Depends(get_db), user=Depends(get_optional_user)):
    symbol = body.get("symbol")
    entry = body.get("entry")
    or_high = body.get("orHigh") or body.get("or_high") or body.get("rangeHigh")
    or_low = body.get("orLow") or body.get("or_low") or body.get("rangeLow")
    stop = body.get("stop", "or-mid")
    target = body.get("target", "1R")
    level = body.get("level")
    setup = body.get("setup", "orb")
    interval = body.get("interval", "5m")
    now = body.get("now")
    offline = body.get("offline")
    flat_by = body.get("flatBy") or body.get("flat_by")
    entry_time = body.get("entryTime") or body.get("entry_time")

    # Validation: need at least entry or we try to read trader/entry.json
    result = exit_service.plan(symbol=symbol, entry=entry, or_high=or_high, or_low=or_low, stop=stop, target=target, level=level, setup=setup, interval=interval, now=now, offline=offline, flat_by=flat_by, entry_time=entry_time)
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("error"))

    # Save server-side
    try:
        plan = ExitPlan(
            user_id=user.id if user else None,
            symbol=result.get("symbol") or (symbol.upper() if symbol else "UNKNOWN"),
            entry_price=result.get("entry"),
            stop_price=result.get("stop"),
            stop_rule=result.get("stopRule"),
            target_price=result.get("target"),
            target_r=result.get("targetR"),
            flat_by=result.get("flatBy"),
            risk_reward=result.get("rewardRisk"),
            raw=result.get("raw") or result
        )
        db.add(plan)
        db.commit()
        db.refresh(plan)
        result["planId"] = plan.id
    except Exception as e:
        pass

    # Also write trader/plan.json for downstream modules (budget, risk, timemachine)
    try:
        import os, json as js
        os.makedirs("trader", exist_ok=True)
        raw = result.get("raw") or result
        # Ensure we write full plan.json in expected shape
        to_write = raw if isinstance(raw, dict) else result
        with open("trader/plan.json", "w", encoding="utf-8") as fh:
            js.dump(to_write, fh, indent=2)
    except: pass

    return result

@router.get("/plan/{symbol}")
def get_plan(symbol: str, db: Session = Depends(get_db), user=Depends(get_optional_user)):
    q = db.query(ExitPlan).filter(ExitPlan.symbol == symbol.upper())
    if user:
        q = q.filter(ExitPlan.user_id == user.id)
    plan = q.order_by(ExitPlan.created_at.desc()).first()
    if not plan:
        raise HTTPException(status_code=404, detail="No plan for symbol")
    return {"symbol": plan.symbol, "entry": plan.entry_price, "stop": plan.stop_price, "stopRule": plan.stop_rule, "target": plan.target_price, "targetR": plan.target_r, "flatBy": plan.flat_by, "riskReward": plan.risk_reward, "raw": plan.raw, "planId": plan.id, "createdAt": plan.created_at.isoformat() if plan.created_at else None}

@router.get("/plan")
def list_plans(db: Session = Depends(get_db), user=Depends(get_optional_user)):
    q = db.query(ExitPlan)
    if user:
        q = q.filter(ExitPlan.user_id == user.id)
    plans = q.order_by(ExitPlan.created_at.desc()).limit(20).all()
    return [{"id": p.id, "symbol": p.symbol, "entry": p.entry_price, "stop": p.stop_price, "target": p.target_price, "raw": p.raw, "createdAt": p.created_at.isoformat() if p.created_at else None} for p in plans]
