import urllib.request
import urllib.error
import json
import time
import datetime
from backend.services import cache

UA = "Mozilla/5.0 (compatible; day-trader-skill/2.0; +https://github.com/AgainHeist/day-trader-skill)"
HOSTS = ["https://query2.finance.yahoo.com", "https://query1.finance.yahoo.com"]

def _nth_sunday(year, month, n):
    import datetime as dt
    d = dt.date(year, month, 1)
    d += dt.timedelta(days=(6 - d.weekday()) % 7)
    return d + dt.timedelta(weeks=n - 1)

def eastern_offset(utc_dt):
    y = utc_dt.year
    start = datetime.datetime.combine(_nth_sunday(y, 3, 2), datetime.time(7, 0))
    end = datetime.datetime.combine(_nth_sunday(y, 11, 1), datetime.time(6, 0))
    naive = utc_dt.replace(tzinfo=None)
    return -4 if start <= naive < end else -5

def get_quote(symbol: str):
    symbol = symbol.upper().strip()
    key = cache.cache_key("quote", symbol)
    cached = cache.get(key)
    if cached:
        return cached

    yahoo_sym = symbol.replace(".", "-")
    last_error = None
    for host in HOSTS:
        url = f"{host}/v8/finance/chart/{yahoo_sym}?range=1d&interval=5m"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode())
            result = data.get("chart", {}).get("result", [])
            if not result:
                err = data.get("chart", {}).get("error", {})
                raise Exception(err.get("description", "No data"))
            meta = result[0].get("meta", {})
            price = meta.get("regularMarketPrice")
            prev = meta.get("previousClose") or meta.get("chartPreviousClose")
            # fall back to last close from indicators if meta missing
            if price is None:
                indicators = result[0].get("indicators", {})
                quote = indicators.get("quote", [{}])[0]
                closes = quote.get("close", [])
                # find last non-null
                for c in reversed(closes):
                    if c is not None:
                        price = c
                        break
            out = {
                "symbol": symbol,
                "price": price,
                "previousClose": prev,
                "currency": meta.get("currency", "USD"),
                "exchange": meta.get("exchangeName", ""),
                "marketState": meta.get("marketState", "UNKNOWN"),
                "regularMarketTime": meta.get("regularMarketTime"),
                "status": "LIVE" if price is not None else "DATA UNAVAILABLE",
                "source": "yahoo",
            }
            if price is not None and prev:
                out["change"] = round(price - prev, 4)
                out["changePercent"] = round((price - prev) / prev * 100, 2) if prev else None
            cache.set(key, out, ttl=15)
            return out
        except urllib.error.HTTPError as e:
            last_error = f"HTTP {e.code}: {e.reason}"
            if e.code in (429, 500, 502, 503):
                time.sleep(0.5)
                continue
            break
        except Exception as e:
            last_error = str(e)
            break

    return {
        "symbol": symbol,
        "price": None,
        "previousClose": None,
        "status": "DATA UNAVAILABLE",
        "error": last_error,
        "source": "yahoo",
    }

def get_chart(symbol: str, range_: str = "1d", interval: str = "5m"):
    symbol = symbol.upper().strip()
    key = cache.cache_key("chart", symbol, range_, interval)
    cached = cache.get(key)
    if cached:
        return cached

    yahoo_sym = symbol.replace(".", "-")
    last_error = None
    for host in HOSTS:
        url = f"{host}/v8/finance/chart/{yahoo_sym}?range={range_}&interval={interval}"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode())
            result = data.get("chart", {}).get("result", [])
            if not result:
                raise Exception(data.get("chart", {}).get("error", {}).get("description", "No chart data"))
            r = result[0]
            timestamps = r.get("timestamp", [])
            quote = r.get("indicators", {}).get("quote", [{}])[0]
            closes = quote.get("close", [])
            highs = quote.get("high", [])
            lows = quote.get("low", [])
            opens = quote.get("open", [])
            volumes = quote.get("volume", [])
            bars = []
            for i, ts in enumerate(timestamps):
                if i < len(closes):
                    bars.append({
                        "timestamp": ts,
                        "datetime": datetime.datetime.fromtimestamp(ts, tz=datetime.timezone.utc).isoformat(),
                        "open": opens[i] if i < len(opens) else None,
                        "high": highs[i] if i < len(highs) else None,
                        "low": lows[i] if i < len(lows) else None,
                        "close": closes[i] if i < len(closes) else None,
                        "volume": volumes[i] if i < len(volumes) else None,
                    })
            meta = r.get("meta", {})
            out = {
                "symbol": symbol,
                "range": range_,
                "interval": interval,
                "meta": meta,
                "bars": bars,
                "status": "LIVE" if bars else "DATA UNAVAILABLE",
                "source": "yahoo",
            }
            ttl = 30 if interval in ("1m", "5m") else 120
            cache.set(key, out, ttl=ttl)
            return out
        except urllib.error.HTTPError as e:
            last_error = f"HTTP {e.code}"
            if e.code in (429, 500, 502, 503):
                time.sleep(0.5)
                continue
            break
        except Exception as e:
            last_error = str(e)
            break

    return {
        "symbol": symbol,
        "range": range_,
        "interval": interval,
        "bars": [],
        "status": "DATA UNAVAILABLE",
        "error": last_error,
        "source": "yahoo",
    }

def get_market_status():
    # Use current NY time to determine open/close
    now_utc = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    # Simple: check if weekday and not holiday (use same list as scan.py)
    # For web we just report based on time; detailed calendar handled by workers
    et_offset = eastern_offset(now_utc + datetime.timedelta(hours=0))  # approx
    et_now = now_utc + datetime.timedelta(hours=et_offset)
    is_weekday = et_now.weekday() < 5
    is_open_hours = datetime.time(9, 30) <= et_now.time() <= datetime.time(16, 0)
    status = "OPEN" if (is_weekday and is_open_hours) else "CLOSED"
    return {
        "status": status,
        "et_time": et_now.strftime("%Y-%m-%d %H:%M:%S ET"),
        "utc_time": now_utc.isoformat() + "Z",
        "is_open": status == "OPEN",
        "next_open": "09:30 ET next trading day" if status == "CLOSED" else None,
    }
