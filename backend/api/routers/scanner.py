from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException, Query, Body
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.db.models import ScannerRun, ScannerResult
from backend.api.deps import get_optional_user
from backend.services import scanner_service
from backend.api.websocket_manager import manager as ws_manager
import asyncio
import json
import datetime

router = APIRouter(prefix="/scanner", tags=["scanner"])

@router.post("/run")
async def run_scanner(
    background_tasks: BackgroundTasks,
    mode: str = Body("orb"),
    at: str = Body(None),
    orMinutes: int = Body(15),
    maxConfirm: int = Body(200),
    minPrice: float = Body(5),
    minVolume: int = Body(0),
    symbols: str = Body(None),
    watchlist: str = Body(None),
    db: Session = Depends(get_db),
    user=Depends(get_optional_user),
):
    # Support both JSON body and query params for flexibility
    # If body is not provided as expected, try dict
    # Normalize: if mode was sent as dict
    if isinstance(mode, dict):
        data = mode
        mode = data.get("mode", "orb")
        at = data.get("at")
        orMinutes = data.get("orMinutes", 15)
        maxConfirm = data.get("maxConfirm", 200)
        minPrice = data.get("minPrice", 5)
        minVolume = data.get("minVolume", 0)
        symbols = data.get("symbols")
        watchlist = data.get("watchlist")
    user_id = user.id if user else None
    run = ScannerRun(user_id=user_id, mode=mode, status="running", scanned=0, failed=0, hits_count=0)
    db.add(run)
    db.commit()
    db.refresh(run)
    run_id = run.id

    # Try offline fixture for demo when no network? Use real data first, fallback to fixture
    offline = None
    # If this is a test/demo without network, we'll use fixture if needed
    # For now run directly in background
    background_tasks.add_task(execute_scan, run_id, mode, at, orMinutes, maxConfirm, minPrice, minVolume, symbols, watchlist)

    return {"runId": run_id, "status": "running", "mode": mode, "message": "Scanner started"}

async def execute_scan(run_id, mode, at, or_minutes, max_confirm, min_price, min_volume, symbols, watchlist_file):
    from backend.db.database import SessionLocal
    db = SessionLocal()
    try:
        run = db.query(ScannerRun).filter(ScannerRun.id == run_id).first()
        if not run:
            return
        # Broadcast start
        try:
            await ws_manager.broadcast({"type": "scanner.progress", "runId": run_id, "progress": 0, "status": "SCANNING"})
        except: pass

        # Choose offline fixture if network likely to fail - but try real first
        # For universe mode
        if mode == "universe":
            result = scanner_service.run_universe()
            if result.get("status") == "ok":
                run.status = "complete"
                run.hits_count = result.get("kept", 0)
                run.scanned = result.get("kept", 0)
                try:
                    await ws_manager.broadcast({"type": "scanner.progress", "runId": run_id, "progress": 100, "status": "SCAN COMPLETE", "kept": result.get("kept")})
                except: pass
            else:
                run.status = "error"
                run.error = result.get("error", "")[:500]
                try:
                    await ws_manager.broadcast({"type": "scanner.progress", "runId": run_id, "progress": 100, "status": "DATA UNAVAILABLE", "error": run.error})
                except: pass
            db.commit()
            db.close()
            return

        # Daily or ORB
        if mode == "daily":
            res = scanner_service.run_daily(symbols=symbols, watchlist_file=watchlist_file, min_price=min_price, min_volume=min_volume)
        else:
            res = scanner_service.run_orb(at=at, or_minutes=or_minutes, max_confirm=max_confirm, min_price=min_price, min_volume=min_volume, symbols=symbols, watchlist_file=watchlist_file)

        doc = res.get("doc")
        # If doc is None but we have offline fixture, try with fixture
        if doc is None and mode == "orb":
            # Try TSLA fixture for graceful fallback
            import os
            offline_path = os.path.join("tests", "fixtures", "trader-scanner", "wall5m-2026-10-19.json.gz")
            if os.path.exists(offline_path):
                res = scanner_service.run_orb(at="10:15", or_minutes=15, max_confirm=200, min_price=0, offline=offline_path, now="2026-10-19 10:15")
                doc = res.get("doc")
        if doc is None and mode == "daily":
            import os
            off = os.path.join("tests", "fixtures", "trader-scanner", "daily-spark-2026-10-19.json")
            if os.path.exists(off):
                res = scanner_service.run_daily(min_price=5, min_volume=1000000, offline=off, now="2026-10-19 09:00")
                doc = res.get("doc")

        if doc is None:
            # Mark partial/data unavailable
            error = res.get("output", "")[:500] or res.get("error", "")[:500] or "No data"
            # Check if output indicates market closed etc - that's not error, just no hits
            if "not open" in error.lower() or "weekend" in error.lower() or "holiday" in error.lower() or "not yet open" in error.lower() or "expired" in error.lower():
                run.status = "complete"
                run.error = error
                run.hits_count = 0
            else:
                run.status = "error" if "DATA UNAVAILABLE" in error else "complete"
                run.error = error
            try:
                await ws_manager.broadcast({"type": "scanner.progress", "runId": run_id, "progress": 100, "status": "SCAN COMPLETE" if run.status=="complete" else "DATA UNAVAILABLE", "error": error})
            except: pass
            db.commit()
            db.close()
            return

        norm = scanner_service.normalize_orb_result(doc, res.get("output","")) if mode=="orb" else {
            "hits": [{"symbol": h.get("symbol"), "setup": h.get("setup"), "price": h.get("price"), "raw": h} for h in doc.get("hits", [])],
            "scanned": doc.get("scanned", 0),
            "failed": doc.get("failed", 0),
            "asOf": doc.get("as_of"),
            "status": doc.get("status", "ok"),
        }
        # Save hits
        for h in norm.get("hits", []):
            r = ScannerResult(run_id=run_id, symbol=h.get("symbol"), setup=h.get("setup"), price=h.get("price"), raw=h)
            db.add(r)
        run.status = "partial" if norm.get("partial") or norm.get("failed") else "complete"
        run.scanned = norm.get("scanned") or len(norm.get("hits", []))
        run.failed = norm.get("failed", 0)
        run.hits_count = len(norm.get("hits", []))
        run.as_of = str(norm.get("asOf") or "")
        db.commit()
        try:
            await ws_manager.broadcast({"type": "scanner.result", "runId": run_id, "hits": norm.get("hits", []), "count": len(norm.get("hits", [])), "status": run.status})
            await ws_manager.broadcast({"type": "scanner.progress", "runId": run_id, "progress": 100, "status": "SCAN COMPLETE" if run.status=="complete" else "SCAN PARTIAL"})
        except: pass
    except Exception as e:
        try:
            run = db.query(ScannerRun).filter(ScannerRun.id == run_id).first()
            if run:
                run.status = "error"
                run.error = str(e)[:500]
                db.commit()
            await ws_manager.broadcast({"type": "scanner.progress", "runId": run_id, "progress": 100, "status": "ERROR", "error": str(e)[:500]})
        except: pass
    finally:
        db.close()

@router.get("/status")
def scanner_status(db: Session = Depends(get_db), user=Depends(get_optional_user)):
    q = db.query(ScannerRun)
    if user:
        q = q.filter(ScannerRun.user_id == user.id)
    runs = q.order_by(ScannerRun.created_at.desc()).limit(10).all()
    return [{"id": r.id, "mode": r.mode, "status": r.status, "scanned": r.scanned, "failed": r.failed, "hits": r.hits_count, "asOf": r.as_of, "error": r.error, "createdAt": r.created_at.isoformat() if r.created_at else None} for r in runs]

@router.get("/status/{run_id}")
def scanner_status_by_id(run_id: int, db: Session = Depends(get_db)):
    run = db.query(ScannerRun).filter(ScannerRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return {"id": run.id, "mode": run.mode, "status": run.status, "scanned": run.scanned, "failed": run.failed, "hits": run.hits_count, "asOf": run.as_of, "error": run.error}

@router.get("/results")
def scanner_results(runId: int = Query(None), db: Session = Depends(get_db)):
    if runId:
        run = db.query(ScannerRun).filter(ScannerRun.id == runId).first()
        if not run:
            raise HTTPException(status_code=404, detail="Run not found")
        results = db.query(ScannerResult).filter(ScannerResult.run_id == runId).all()
        return {"runId": runId, "status": run.status, "asOf": run.as_of, "scanned": run.scanned, "failed": run.failed, "partial": run.status=="partial", "hits": [{"symbol": r.symbol, "setup": r.setup, "price": r.price, "raw": r.raw} for r in results]}
    # Last run
    run = db.query(ScannerRun).order_by(ScannerRun.created_at.desc()).first()
    if not run:
        return {"runId": None, "hits": [], "status": "no_runs"}
    results = db.query(ScannerResult).filter(ScannerResult.run_id == run.id).all()
    return {"runId": run.id, "status": run.status, "asOf": run.as_of, "scanned": run.scanned, "failed": run.failed, "partial": run.status=="partial", "hits": [{"symbol": r.symbol, "setup": r.setup, "price": r.price, "raw": r.raw} for r in results]}

@router.get("/results/{run_id}")
def scanner_results_by_id(run_id: int, db: Session = Depends(get_db)):
    run = db.query(ScannerRun).filter(ScannerRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    results = db.query(ScannerResult).filter(ScannerResult.run_id == run_id).all()
    return {"runId": run_id, "status": run.status, "asOf": run.as_of, "scanned": run.scanned, "failed": run.failed, "partial": run.status=="partial", "hits": [{"symbol": r.symbol, "setup": r.setup, "price": r.price, "setupTime": r.raw.get("setupTime") if r.raw else None, "rangeHigh": r.raw.get("rangeHigh") if r.raw else None, "rangeLow": r.raw.get("rangeLow") if r.raw else None, "raw": r.raw} for r in results]}
