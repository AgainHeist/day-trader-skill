import os
import sys
import importlib.util
import io
import json
from contextlib import redirect_stdout, redirect_stderr

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def load_entry():
    path = os.path.join(ROOT, "trader-entry", "entry.py")
    spec = importlib.util.spec_from_file_location("trader_entry", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

entry_mod = load_entry()

def check(symbol: str, setup="orb", interval="5m", level=None, or_minutes=15, min_volume_x=None, now=None, offline=None):
    argv = ["check", symbol.upper()]
    argv += ["--setup", setup, "--interval", interval, "--or-minutes", str(or_minutes)]
    if level is not None:
        argv += ["--level", str(level)]
    if min_volume_x:
        argv += ["--min-volume-x", str(min_volume_x)]
    if now:
        argv += ["--now", now]
    if offline:
        argv += ["--offline", offline]
    argv += ["--json"]
    out, err = io.StringIO(), io.StringIO()
    with redirect_stdout(out), redirect_stderr(err):
        try:
            code = entry_mod.main(argv)
        except SystemExit as e:
            code = e.code if isinstance(e.code, int) else 0
        except Exception as e:
            return {"status": "NO DATA", "error": str(e), "symbol": symbol, "code": 1}
    text = out.getvalue().strip() + err.getvalue().strip()
    # Try JSON parse, else plain text
    doc = None
    # entry.py --json outputs JSON
    combined = out.getvalue().strip()
    if combined.startswith("{"):
        try:
            doc = json.loads(combined)
        except:
            pass
    if doc:
        # Normalize
        status = doc.get("status", "").upper()
        # entry.py uses: triggered, waiting, expired, no-data
        mapping = {
            "triggered": "TRIGGERED",
            "waiting": "WAITING",
            "expired": "EXPIRED",
            "no-data": "NO DATA",
            "not-open": "NOT OPEN",
        }
        norm_status = mapping.get(status.lower(), status.upper() if status else "NO DATA")
        return {
            "symbol": symbol.upper(),
            "status": norm_status,
            "setup": doc.get("setup", setup),
            "interval": doc.get("interval", interval),
            "price": doc.get("price") or doc.get("close") or doc.get("entry_price"),
            "triggerPrice": doc.get("price") or doc.get("close"),
            "triggerTime": doc.get("time") or doc.get("setup_time"),
            "rangeHigh": doc.get("range_high"),
            "rangeLow": doc.get("range_low"),
            "level": doc.get("level") or level,
            "distancePct": doc.get("pct") or doc.get("distance_pct"),
            "raw": doc,
            "code": code,
        }
    else:
        # Fallback: parse plain line
        text_line = (out.getvalue() + err.getvalue()).strip().lower()
        if "triggered" in text_line:
            return {"symbol": symbol.upper(), "status": "TRIGGERED", "rawText": text_line, "code": 0}
        if "waiting" in text_line:
            return {"symbol": symbol.upper(), "status": "WAITING", "rawText": text_line, "code": 1}
        if "expired" in text_line:
            return {"symbol": symbol.upper(), "status": "EXPIRED", "rawText": text_line, "code": 1}
        if "not open" in text_line or "not yet open" in text_line:
            return {"symbol": symbol.upper(), "status": "NOT OPEN", "rawText": text_line, "code": 1}
        return {"symbol": symbol.upper(), "status": "NO DATA", "rawText": text_line or "No data", "error": text_line, "code": code or 1}

def describe_status(doc):
    if not doc:
        return "NO DATA"
    return doc.get("status", "NO DATA")
