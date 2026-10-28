"""Background workers: scanner, entry watcher, alert worker.

Run with: python -m workers.main  (from backend/ or repo root via python -m backend.workers.main)

Each worker polls appropriately and emits WebSocket events.
"""
import asyncio
import time
import datetime
import os
import sys
import json

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.dirname(ROOT) if ROOT.endswith("backend") else ROOT)
# Ensure backend is importable
if os.path.exists(os.path.join(ROOT, "backend")):
    sys.path.insert(0, ROOT)
elif os.path.exists("backend"):
    sys.path.insert(0, os.getcwd())

from backend.db.database import SessionLocal
from backend.db.models import Alert, AlertEvent

async def scanner_worker():
    print("[scanner-worker] idle - scans are job-based via API POST /api/scanner/run")
    while True:
        await asyncio.sleep(60)

async def entry_watcher():
    print("[entry-watcher] polling every 30s for active watches")
    while True:
        try:
            db = SessionLocal()
            # Find active WAITING entry setups created in last trading day
            from backend.db.models import EntrySetup
            watches = db.query(EntrySetup).filter(EntrySetup.status == "WAITING").order_by(EntrySetup.created_at.desc()).limit(20).all()
            for w in watches:
                # Re-check entry condition
                try:
                    from backend.services import entry_service
                    result = entry_service.check(w.symbol, setup=w.setup or "orb", interval=w.interval or "5m")
                    if result.get("status") != w.status:
                        w.status = result.get("status")
                        w.entry_price = result.get("price") or result.get("triggerPrice")
                        w.entry_time = result.get("triggerTime")
                        w.raw = result
                        db.commit()
                        # Emit websocket
                        try:
                            from backend.api.websocket_manager import manager as ws_manager
                            await ws_manager.broadcast({"type": "entry.updated", "symbol": w.symbol, "status": result.get("status"), "data": result})
                            if result.get("status") == "TRIGGERED":
                                await ws_manager.broadcast({"type": "entry.triggered", "symbol": w.symbol, "status": "TRIGGERED", "data": result})
                        except: pass
                except Exception as e:
                    pass
            db.close()
        except Exception as e:
            print(f"[entry-watcher] error: {e}")
        await asyncio.sleep(30)

async def alert_worker():
    print("[alert-worker] polling every 20s")
    while True:
        try:
            db = SessionLocal()
            pending = db.query(Alert).filter(Alert.triggered == False).all()
            if pending:
                # Group symbols
                symbols = list({a.symbol for a in pending if a.symbol})
                quotes = {}
                if symbols:
                    try:
                        from backend.services.market_service import get_quote
                        for sym in symbols:
                            q = get_quote(sym)
                            if q.get("price") is not None:
                                quotes[sym] = q.get("price")
                    except: pass
                now_utc = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
                # Market status check for time-based alerts
                try:
                    from backend.services.alerts_service import alerts_mod as am
                    status = am.market_status(now_utc)
                except:
                    status = {}
                for al in pending:
                    triggered = False
                    price = None
                    # Time alerts
                    if al.rule_type == "time" and al.at_time:
                        # Check if current NY time past at_time on trading day
                        try:
                            from backend.services.alerts_service import alerts_mod
                            # Use alerts evaluate logic: need to check if time rang
                            # Simple check: if now ET hour:minute >= at_time and is trading day
                            et_offset = alerts_mod.eastern_offset(now_utc) if hasattr(alerts_mod, 'eastern_offset') else -4
                            et_now = now_utc + datetime.timedelta(hours=et_offset)
                            at = al.at_time
                            h, m = map(int, at.split(":"))
                            if et_now.hour > h or (et_now.hour == h and et_now.minute >= m):
                                # Check if today is trading day
                                is_trading = True
                                try:
                                    is_trading = alerts_mod.trading_day(et_now.date())[0] if hasattr(alerts_mod, 'trading_day') else True
                                except: pass
                                if is_trading:
                                    triggered = True
                        except: pass
                    elif al.rule_type == "opening_bell":
                        try:
                            if status.get("is_open") if isinstance(status, dict) else False:
                                # Only trigger once per day
                                triggered = True
                        except: pass
                    elif al.symbol and al.symbol in quotes:
                        price = quotes[al.symbol]
                        if al.rule_type in ("above", "target") and price is not None and al.price is not None:
                            if price >= al.price:
                                triggered = True
                        elif al.rule_type in ("below", "stop") and price is not None and al.price is not None:
                            if price <= al.price:
                                triggered = True
                    if triggered:
                        al.triggered = True
                        al.triggered_at = now_utc
                        evt = AlertEvent(alert_id=al.id, event_type="triggered", price=price)
                        db.add(evt)
                        # WebSocket
                        try:
                            from backend.api.websocket_manager import manager as ws_manager
                            await ws_manager.broadcast({"type": "alert.triggered", "alertId": al.id, "symbol": al.symbol, "price": price, "ruleType": al.rule_type, "label": al.label})
                        except: pass
                db.commit()
            db.close()
        except Exception as e:
            print(f"[alert-worker] error: {e}")
        await asyncio.sleep(20)

async def market_broadcaster():
    print("[market-broadcaster] pushing system status every 30s")
    while True:
        try:
            from backend.api.websocket_manager import manager as ws_manager
            from backend.services.market_service import get_market_status
            status = get_market_status()
            await ws_manager.broadcast({"type": "system.status", "data": status})
        except: pass
        await asyncio.sleep(30)

async def main():
    await asyncio.gather(
        scanner_worker(),
        entry_watcher(),
        alert_worker(),
        market_broadcaster(),
    )

if __name__ == "__main__":
    print("Starting Day Trader Web workers...")
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Workers stopped")
