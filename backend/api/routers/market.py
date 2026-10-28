from fastapi import APIRouter, Query
from backend.services.market_service import get_quote, get_chart

router = APIRouter(prefix="/market", tags=["market"])

@router.get("/quote/{symbol}")
def quote(symbol: str):
    result = get_quote(symbol)
    # Ensure we never return fake data - mark unavailable honestly
    if result.get("price") is None:
        result["status"] = "DATA UNAVAILABLE"
        result["message"] = result.get("error") or "No data from provider"
    return result

@router.get("/chart/{symbol}")
def chart(symbol: str, range: str = Query("1d", alias="range"), interval: str = Query("5m")):
    result = get_chart(symbol, range, interval)
    if not result.get("bars"):
        result["status"] = "DATA UNAVAILABLE" if result.get("status") != "LIVE" else result["status"]
    return result

@router.get("/indices")
def indices():
    # Fetch major indices quotes
    symbols = ["^GSPC", "^IXIC", "^DJI"]
    out = {}
    for sym in symbols:
        q = get_quote(sym)
        out[sym] = q
    return out
