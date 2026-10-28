from fastapi import APIRouter, Depends, BackgroundTasks, Body, HTTPException, Query
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.db.models import EntrySetup
from backend.api.deps import get_optional_user
from backend.services import entry_service
from backend.api.websocket_manager import manager as ws_manager
import asyncio
import json

router = APIRouter(prefix="/entry", tags=["entry"])

@router.post("/check")
def check_entry(body: dict = Body(...), db: Session = Depends(get_db), user=Depends(get_optional_user)):
    symbol = body.get("symbol") or body.get("ticker")
    if not symbol:
        raise HTTPException(status_code=400, detail="symbol required")
    setup = body.get("setup", "orb")
    interval = body.get("interval", "5m")
    level = body.get("level")
    or_minutes = body.get("orMinutes", 15)
    min_volume_x = body.get("minVolumeX")
    now = body.get("now")
    offline = body.get("offline")
    result = entry_service.check(symbol, setup=setup, interval=interval, level=level, or_minutes=or_minutes, min_volume_x=min_volume_x, now=now, offline=offline)
    # Save to DB if triggered
    try:
        if result.get("status") in ("TRIGGERED", "WAITING", "EXPIRED", "NOT OPEN"):
            entry = EntrySetup(
                user_id=user.id if user else None,
                symbol=result.get("symbol", symbol.upper()),
                setup=setup,
                interval=interval,
                level=level,
                status=result.get("status"),
                entry_price=result.get("price") or result.get("triggerPrice"),
                entry_time=result.get("triggerTime"),
                range_high=result.get("rangeHigh"),
                range_low=result.get("rangeLow"),
                raw=result
            )
            db.add(entry)
            db.commit()
    except: pass
    # Broadcast if triggered
    if result.get("status") == "TRIGGERED":
        import asyncio
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(ws_manager.broadcast({"type": "entry.triggered", "symbol": symbol.upper(), "status": "TRIGGERED", "data": result}))
        except: pass
    return result

@router.get("/status/{symbol}")
def entry_status(symbol: str, setup: str = Query("orb"), interval: str = Query("5m"), level: float = Query(None), orMinutes: int = Query(15), db: Session = Depends(get_db)):
    result = entry_service.check(symbol, setup=setup, interval=interval, level=level, or_minutes=orMinutes)
    return result

@router.post("/watch")
def start_watch(body: dict = Body(...), background_tasks: BackgroundTasks = None, db: Session = Depends(get_db), user=Depends(get_optional_user)):
    symbol = body.get("symbol") or body.get("ticker")
    if not symbol:
        raise HTTPException(status_code=400, detail="symbol required")
    setup = body.get("setup", "orb")
    interval = body.get("interval", "5m")
    every = body.get("every", 30)
    # Create watcher entry
    entry = EntrySetup(
        user_id=user.id if user else None,
        symbol=symbol.upper(),
        setup=setup,
        interval=interval,
        status="WAITING",
        raw={"watch": True, "every": every, "symbol": symbol.upper()}
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    if background_tasks:
        background_tasks.add_task(run_watch, entry.id, symbol, setup, interval, every)
    return {"watchId": entry.id, "symbol": symbol.upper(), "status": "WAITING", "message": "Watch started"}

async def run_watch(watch_id, symbol, setup, interval, every):
    from backend.db.database import SessionLocal
    db = SessionLocal()
    try:
        for i in range(120):  # up to 1 hour of checks
            result = entry_service.check(symbol, setup=setup, interval=interval)
            status = result.get("status")
            if status == "TRIGGERED":
                try:
                    await ws_manager.broadcast({"type": "entry.triggered", "symbol": symbol.upper(), "status": status, "data": result})
                    await ws_manager.broadcast({"type": "entry.updated", "symbol": symbol.upper(), "status": status, "data": result})
                except: pass
                # Update DB
                w = db.query(EntrySetup).filter(EntrySetup.id == watch_id).first()
                if w:
                    w.status = "TRIGGERED"
                    w.entry_price = result.get("price")
                    w.entry_time = result.get("triggerTime")
                    w.raw = result
                    db.commit()
                break
            else:
                try:
                    await ws_manager.broadcast({"type": "entry.updated", "symbol": symbol.upper(), "status": status, "data": result})
                except: pass
            await asyncio.sleep(every)
    except Exception as e:
        pass
    finally:
        db.close()

@router.get("/watchlist")
def watchlist_status(db: Session = Depends(get_db)):
    # Return recent entry setups
    rows = db.query(EntrySetup).order_by(EntrySetup.created_at.desc()).limit(20).all()
    return [{"id": r.id, "symbol": r.symbol, "setup": r.setup, "status": r.status, "price": r.entry_price, "time": r.entry_time, "raw": r.raw, "createdAt": r.created_at.isoformat() if r.created_at else None} for r in rows]
