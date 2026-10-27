import os
import sys

# Add project root to path so we can import trader modules
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, ROOT)

# We reuse the skill's scan.py directly via importlib
import importlib.util
import json
import datetime

def load_scan():
    path = os.path.join(ROOT, "trader-scanner", "scan.py")
    spec = importlib.util.spec_from_file_location("trader_scan", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

scan = load_scan()

def run_universe():
    try:
        texts = {}
        for fname in scan.NASDAQ_FILES:
            url = scan.NASDAQ_URL + fname
            body = scan.http_get(url)
            texts[fname] = body
        kept, counts, created = scan.build_universe(texts)
        # Write to trader/universe.txt for compatibility
        os.makedirs("trader", exist_ok=True)
        with open("trader/universe.txt", "w", encoding="utf-8") as fh:
            for sym, name in kept:
                fh.write(f"{sym}|{name}\n")
        return {
            "status": "ok",
            "kept": len(kept),
            "counts": counts,
            "created": created,
            "symbols": [{"symbol": s, "name": n} for s, n in kept],
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}

def run_daily(symbols=None, watchlist_file=None, limit=None, min_price=5, min_volume=1000000, now=None, offline=None):
    import io
    from contextlib import redirect_stdout, redirect_stderr
    argv = ["daily"]
    if symbols:
        argv += ["--symbols", ",".join(symbols) if isinstance(symbols, list) else symbols]
    if watchlist_file:
        argv += ["--watchlist", watchlist_file]
    if limit:
        argv += ["--limit", str(limit)]
    argv += ["--min-price", str(min_price), "--min-volume", str(min_volume)]
    if now:
        argv += ["--now", now]
    if offline:
        argv += ["--offline", offline]
    argv += ["--json"]
    out, err = io.StringIO(), io.StringIO()
    from contextlib import redirect_stdout, redirect_stderr
    with redirect_stdout(out), redirect_stderr(err):
        try:
            code = scan.main(argv)
        except SystemExit as e:
            code = e.code
    text = out.getvalue() + err.getvalue()
    try:
        doc = json.loads(text) if text.strip().startswith("{") else None
    except:
        doc = None
    return {"code": code, "output": text, "doc": doc}

def run_orb(at=None, or_minutes=15, max_confirm=200, min_price=5, min_volume=0, symbols=None, watchlist_file=None, now=None, offline=None):
    import io
    from contextlib import redirect_stdout, redirect_stderr
    argv = ["orb"]
    if at:
        argv += ["--at", at]
    argv += ["--or-minutes", str(or_minutes), "--max-confirm", str(max_confirm)]
    argv += ["--min-price", str(min_price), "--min-volume", str(min_volume)]
    if symbols:
        argv += ["--symbols", ",".join(symbols) if isinstance(symbols, list) else symbols]
    if watchlist_file:
        argv += ["--watchlist", watchlist_file]
    if now:
        argv += ["--now", now]
    if offline:
        argv += ["--offline", offline]
    argv += ["--json"]
    out, err = io.StringIO(), io.StringIO()
    with redirect_stdout(out), redirect_stderr(err):
        try:
            code = scan.main(argv)
        except SystemExit as e:
            code = e.code
    text = out.getvalue() + err.getvalue()
    try:
        doc = json.loads(text) if text.strip().startswith("{") else None
    except:
        doc = None
    return {"code": code, "output": text, "doc": doc}

def normalize_orb_result(doc, output_text):
    """Convert scan.py JSON output to API-friendly format"""
    if doc is None:
        return {"hits": [], "status": "DATA UNAVAILABLE", "error": output_text[:500]}
    # scan.py JSON structure: {mode, as_of, universe, scanned, failed, hits[]}
    hits = doc.get("hits", [])
    normalized = []
    for h in hits:
        normalized.append({
            "symbol": h.get("symbol"),
            "setup": h.get("setup", "orb"),
            "price": h.get("price") or h.get("close"),
            "setupTime": h.get("time") or h.get("setup_time") or doc.get("as_of"),
            "rangeHigh": h.get("range_high"),
            "rangeLow": h.get("range_low"),
            "pctAbove": h.get("pct_above") or h.get("pct"),
            "volume": h.get("volume"),
            "dataStatus": "ok" if not doc.get("failed") else "PARTIAL DATA",
            "confirmationStatus": "confirmed" if h.get("range_high") else "pending",
            "raw": h,
        })
    failed = doc.get("failed", 0)
    scanned = doc.get("scanned", 0)
    partial = failed > 0 or doc.get("partial")
    return {
        "asOf": doc.get("as_of") or doc.get("at"),
        "mode": doc.get("mode", "orb"),
        "universe": doc.get("universe"),
        "scanned": scanned,
        "failed": failed,
        "partial": partial,
        "hits": normalized,
        "status": "PARTIAL DATA" if partial else "ok",
        "raw": doc,
    }
