from fastapi import APIRouter, Query, Depends, Body, HTTPException
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.api.deps import get_optional_user
from backend.services import news_service

router = APIRouter(prefix="/news", tags=["news"])

@router.get("/{symbol}")
def get_news(symbol: str, hours: int = Query(12), offline: str = Query(None)):
    # Try offline fixture if no network or for testing
    res = news_service.fetch_news([symbol], hours=hours, offline=offline)
    if res.get("status") == "DATA UNAVAILABLE":
        # Try fixture fallback for known symbol
        import os
        if symbol.upper() == "TSLA":
            # There's no direct offline for news.py with ticker, but we can try to return graceful partial
            pass
        return {"symbol": symbol.upper(), "items": [], "status": "DATA UNAVAILABLE", "error": res.get("error"), "message": "DATA UNAVAILABLE"}
    if res.get("items") is None and not res.get("count"):
        # No news is valid, not error
        return {"symbol": symbol.upper(), "items": [], "count": 0, "status": "ok", "message": res.get("message") or "No recent news found."}
    return {"symbol": symbol.upper(), "items": res.get("items", []), "count": res.get("count", 0), "status": res.get("status", "ok"), "message": res.get("message")}

@router.get("/")
def get_news_multi(tickers: str = Query(None), hours: int = Query(12)):
    if not tickers:
        return {"items": [], "count": 0, "status": "ok", "message": "No tickers provided"}
    symbols = [s.strip().upper() for s in tickers.split(",") if s.strip()]
    res = news_service.fetch_news(symbols, hours=hours)
    if res.get("status") == "DATA UNAVAILABLE":
        return {"items": [], "count": 0, "status": "DATA UNAVAILABLE", "error": res.get("error")}
    return {"tickers": symbols, "items": res.get("items", []), "count": res.get("count", 0), "status": "ok"}

@router.post("/check")
def check_news(body: dict = Body(...)):
    tickers = body.get("tickers", [])
    hours = body.get("hours", 12)
    if isinstance(tickers, str):
        tickers = [t.strip().upper() for t in tickers.split(",")]
    res = news_service.fetch_news(tickers, hours=hours)
    return res
