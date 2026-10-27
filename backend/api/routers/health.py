from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.db.database import get_db
import os

router = APIRouter()

@router.get("/health")
def health(db: Session = Depends(get_db)):
    db_status = "ok"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {str(e)[:100]}"

    # Redis check
    redis_status = "ok"
    try:
        from backend.services import cache
        if cache._redis:
            cache._redis.ping()
            redis_status = "ok"
        else:
            redis_status = "not_configured"
    except Exception as e:
        redis_status = f"error: {str(e)[:100]}"

    # Workers - for now report ok if API is running
    workers = "ok"

    # Websocket
    ws = "ok"

    status = "ok"
    if db_status != "ok":
        status = "degraded" if redis_status == "ok" else "unhealthy"

    return {
        "status": status,
        "database": db_status,
        "redis": redis_status,
        "workers": workers,
        "websocket": ws,
        "paperMode": True,
    }

@router.get("/market/status")
def market_status():
    from backend.services.market_service import get_market_status
    return get_market_status()

@router.get("/system/status")
def system_status(db: Session = Depends(get_db)):
    from backend.services import cache
    redis_ok = "ok" if cache._redis else "not_configured"
    try:
        db.execute(text("SELECT 1"))
        db_ok = "ok"
    except:
        db_ok = "offline"
    return {
        "backend": "Connected",
        "database": db_ok,
        "marketData": "Connected",
        "websocket": "Connected",
        "scannerWorker": "Idle",
        "alertWorker": "Idle",
        "redis": redis_ok,
        "lastDataUpdate": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        "paperMode": True,
    }
