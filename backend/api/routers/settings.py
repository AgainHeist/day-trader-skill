from fastapi import APIRouter, Depends, Body, HTTPException
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.db.models import UserSettings
from backend.api.deps import get_optional_user, get_current_user
import json
import os

router = APIRouter(prefix="/settings", tags=["settings"])

DEFAULT_SETTINGS = {
    "marketData": {"provider": "yahoo", "pause": 0.3},
    "sec": {"userAgent": "DayTraderWeb you@example.com"},
    "aiProvider": {"provider": "openai-compatible", "baseUrl": "", "model": "", "apiType": "openai"},
    "scanner": {"minPrice": 5, "minVolume": 1000000, "orMinutes": 15, "maxConfirm": 200},
    "entryRules": {"noEntriesBefore": "09:45", "noEntriesAfter": "15:30", "interval": "5m"},
    "exitRules": {"stop": "or-mid", "target": "1R", "flatBy": "15:55"},
    "risk": {"budget": 5000, "maxLossPerTradeUsd": 50, "maxDailyLossUsd": 150, "maxTradesPerDay": 3, "maxOrdersPerDay": 10, "minRewardRisk": 1.0, "requireStop": True, "pdtGuard": False},
    "budget": {"cashBufferPct": 10, "maxPositionPct": 75, "maxOrderUsd": 4000, "minOrderUsd": 5, "fractional": False},
    "alerts": {"sound": True, "browserNotify": False},
    "paperTrading": {"paper": True, "broker": "alpaca"},
    "display": {"theme": "dark", "timezone": "America/New_York"},
    "notifications": {"email": False, "push": False},
}

@router.get("/")
def get_settings(db: Session = Depends(get_db), user=Depends(get_optional_user)):
    if user:
        row = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
        if row and row.data:
            merged = {**DEFAULT_SETTINGS, **row.data}
            # Don't expose secrets
            if "aiProvider" in merged and "apiKey" in merged["aiProvider"]:
                merged["aiProvider"] = {**merged["aiProvider"], "apiKey": "***" if merged["aiProvider"]["apiKey"] else ""}
            return merged
    # Fallback to trader/config.json
    cfg_path = "trader/config.json"
    if os.path.exists(cfg_path):
        try:
            with open(cfg_path, encoding="utf-8") as fh:
                file_cfg = json.load(fh)
            # Map to settings structure
            s = dict(DEFAULT_SETTINGS)
            s["risk"]["budget"] = file_cfg.get("budget", s["risk"]["budget"])
            s["risk"]["maxLossPerTradeUsd"] = file_cfg.get("max_loss_per_trade_usd", s["risk"]["maxLossPerTradeUsd"])
            s["risk"]["maxDailyLossUsd"] = file_cfg.get("max_daily_loss_usd", s["risk"]["maxDailyLossUsd"])
            s["risk"]["maxTradesPerDay"] = file_cfg.get("max_trades_per_day", s["risk"]["maxTradesPerDay"])
            s["risk"]["maxOrdersPerDay"] = file_cfg.get("max_orders_per_day", s["risk"]["maxOrdersPerDay"])
            s["risk"]["minRewardRisk"] = file_cfg.get("min_reward_risk", s["risk"]["minRewardRisk"])
            s["risk"]["requireStop"] = file_cfg.get("require_stop", s["risk"]["requireStop"])
            s["risk"]["pdtGuard"] = file_cfg.get("pdt_guard", s["risk"]["pdtGuard"])
            s["budget"]["cashBufferPct"] = file_cfg.get("cash_buffer_pct", s["budget"]["cashBufferPct"])
            s["budget"]["maxPositionPct"] = file_cfg.get("max_position_pct", s["budget"]["maxPositionPct"])
            s["budget"]["maxOrderUsd"] = file_cfg.get("max_order_usd", s["budget"]["maxOrderUsd"])
            s["budget"]["minOrderUsd"] = file_cfg.get("min_order_usd", s["budget"]["minOrderUsd"])
            s["entryRules"]["noEntriesBefore"] = file_cfg.get("no_entries_before", s["entryRules"]["noEntriesBefore"])
            s["entryRules"]["noEntriesAfter"] = file_cfg.get("no_entries_after", s["entryRules"]["noEntriesAfter"])
            s["exitRules"]["flatBy"] = file_cfg.get("flat_by", s["exitRules"]["flatBy"])
            s["paperTrading"]["paper"] = file_cfg.get("paper", True)
            s["paperTrading"]["broker"] = file_cfg.get("broker", "alpaca")
            return s
        except: pass
    return DEFAULT_SETTINGS

@router.post("/")
def save_settings(body: dict = Body(...), db: Session = Depends(get_db), user=Depends(get_optional_user)):
    # Merge with defaults
    current = get_settings(db=db, user=user)
    # Shallow merge
    for k, v in body.items():
        if isinstance(v, dict) and isinstance(current.get(k), dict):
            current[k] = {**current[k], **v}
        else:
            current[k] = v
    # Strip secrets from logging; but store encrypted ideally
    to_store = dict(current)
    # Handle ai api key masking
    if to_store.get("aiProvider", {}).get("apiKey") == "***":
        # Keep old key
        old = db.query(UserSettings).filter(UserSettings.user_id == (user.id if user else -1)).first() if user else None
        if old and old.data and old.data.get("aiProvider", {}).get("apiKey"):
            to_store["aiProvider"]["apiKey"] = old.data["aiProvider"]["apiKey"]

    if user:
        row = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
        if row:
            row.data = to_store
        else:
            row = UserSettings(user_id=user.id, data=to_store)
            db.add(row)
        db.commit()
    # Also write trader/config.json for skill compatibility (only risk/budget/entries fields)
    try:
        cfg = {}
        if "risk" in to_store:
            r = to_store["risk"]
            cfg["budget"] = r.get("budget", 5000)
            cfg["max_loss_per_trade_usd"] = r.get("maxLossPerTradeUsd", 50)
            cfg["max_daily_loss_usd"] = r.get("maxDailyLossUsd", 150)
            cfg["max_trades_per_day"] = r.get("maxTradesPerDay", 3)
            cfg["max_orders_per_day"] = r.get("maxOrdersPerDay", 10)
            cfg["min_reward_risk"] = r.get("minRewardRisk", 1.0)
            cfg["require_stop"] = r.get("requireStop", True)
            cfg["pdt_guard"] = r.get("pdtGuard", False)
        if "budget" in to_store:
            b = to_store["budget"]
            cfg["cash_buffer_pct"] = b.get("cashBufferPct", 10)
            cfg["max_position_pct"] = b.get("maxPositionPct", 75)
            cfg["max_order_usd"] = b.get("maxOrderUsd", 4000)
            cfg["min_order_usd"] = b.get("minOrderUsd", 5)
            cfg["fractional"] = b.get("fractional", False)
        if "entryRules" in to_store:
            e = to_store["entryRules"]
            cfg["no_entries_before"] = e.get("noEntriesBefore", "09:45")
            cfg["no_entries_after"] = e.get("noEntriesAfter", "15:30")
        if "exitRules" in to_store:
            cfg["flat_by"] = to_store["exitRules"].get("flatBy", "15:55")
        if "paperTrading" in to_store:
            cfg["paper"] = to_store["paperTrading"].get("paper", True)
            cfg["broker"] = to_store["paperTrading"].get("broker", "alpaca")
        if "sec" in to_store:
            cfg["sec_user_agent"] = to_store["sec"].get("userAgent", cfg.get("sec_user_agent", "DayTraderWeb you@example.com"))
        os.makedirs("trader", exist_ok=True)
        with open("trader/config.json", "w", encoding="utf-8") as fh:
            json.dump(cfg, fh, indent=2)
    except: pass
    return {"status": "ok", "settings": to_store}

@router.post("/ai")
def save_ai(body: dict = Body(...), db: Session = Depends(get_db), user=Depends(get_optional_user)):
    # Dedicated AI provider endpoint
    current = get_settings(db=db, user=user)
    ai = body.get("aiProvider") or body
    if isinstance(ai, dict):
        current["aiProvider"] = {**current.get("aiProvider", {}), **ai}
    if user:
        row = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
        if row:
            row.data = current
        else:
            row = UserSettings(user_id=user.id, data=current)
            db.add(row)
        db.commit()
    return {"status": "ok", "aiProvider": current["aiProvider"], "message": "AI provider saved (keys stored server-side only)"}
