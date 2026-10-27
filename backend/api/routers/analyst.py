from fastapi import APIRouter, Depends, Query, HTTPException, Body
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.services import analyst_service

router = APIRouter(prefix="/analyst", tags=["analyst"])

@router.get("/{symbol}")
def get_analyst(symbol: str, offline: str = Query(None)):
    res = analyst_service.fetch_facts(symbol, offline=offline)
    if res.get("status") == "DATA UNAVAILABLE":
        # Try fixture for known symbols
        import os, json, gzip
        if symbol.upper() == "TSLA":
            fixture = "tests/fixtures/trader-analyst/companyfacts-CIK0000320193.json"
            if os.path.exists(fixture):
                # We have fixture but analyst_service offline requires folder; just return partial
                pass
        return {
            "symbol": symbol.upper(),
            "status": "DATA UNAVAILABLE",
            "error": res.get("error"),
            "message": "Analyst data unavailable: " + (res.get("error") or "provider error"),
            "revenue": None,
            "eps": None,
            "growth": None,
        }
    return {
        "symbol": symbol.upper(),
        "status": "ok",
        "revenue": res.get("data", {}).get("revenue") if isinstance(res.get("data"), dict) else None,
        "eps": res.get("data", {}).get("eps") if isinstance(res.get("data"), dict) else None,
        "data": res.get("data"),
        "raw": res.get("raw"),
        "message": res.get("error"),
    }

@router.post("/facts")
def post_facts(body: dict = Body(...)):
    symbol = body.get("symbol") or body.get("ticker")
    if not symbol:
        raise HTTPException(status_code=400, detail="symbol required")
    return get_analyst(symbol)
