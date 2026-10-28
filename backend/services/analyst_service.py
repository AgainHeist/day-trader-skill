import os
import sys
import importlib.util
import io
import json

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def load_analyst():
    path = os.path.join(ROOT, "trader-analyst", "facts.py")
    spec = importlib.util.spec_from_file_location("trader_analyst", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

analyst_mod = load_analyst()

def fetch_facts(ticker: str, offline=None):
    ticker = ticker.upper()
    argv = [ticker, "--json"]
    if offline:
        argv += ["--offline", offline]
    out, err = io.StringIO(), io.StringIO()
    from contextlib import redirect_stdout, redirect_stderr
    with redirect_stdout(out), redirect_stderr(err):
        try:
            code = analyst_mod.main(argv)
        except SystemExit as e:
            code = e.code if isinstance(e.code, int) else 1
        except Exception as e:
            return {"status": "DATA UNAVAILABLE", "error": str(e), "ticker": ticker}
    text = out.getvalue().strip()
    err_text = err.getvalue().strip()
    if text.startswith("{"):
        try:
            doc = json.loads(text)
            return {"status": "ok", "ticker": ticker, "data": doc, "raw": doc, "code": code}
        except:
            pass
    if text.startswith("["):
        try:
            doc = json.loads(text)
            return {"status": "ok", "ticker": ticker, "data": doc, "raw": doc}
        except:
            pass
    # Check if data unavailable
    if "rate" in err_text.lower() or "timeout" in err_text.lower() or "unavailable" in err_text.lower():
        return {"status": "DATA UNAVAILABLE", "error": err_text[:500], "ticker": ticker}
    return {"status": "DATA UNAVAILABLE" if code != 0 else "ok", "error": err_text[:500] or text[:500], "ticker": ticker, "rawText": text}
