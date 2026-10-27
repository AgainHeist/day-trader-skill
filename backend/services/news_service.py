import os
import sys
import importlib.util
import io
import json

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def load_news():
    path = os.path.join(ROOT, "trader-news", "news.py")
    spec = importlib.util.spec_from_file_location("trader_news", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

news_mod = load_news()

def fetch_news(tickers: list, hours=12, offline=None, sec=True):
    """Fetch news for tickers using the Fetcher with offline fixtures fallback"""
    # For live, we attempt network fetch but gracefully handle failures
    from contextlib import redirect_stdout, redirect_stderr
    import tempfile

    # Build argv for news.py
    tickers_str = ",".join(tickers) if tickers else ""
    argv = ["--tickers", tickers_str, "--hours", str(hours), "--json"]
    if offline:
        argv += ["--offline", offline]
    if not sec:
        argv += ["--no-sec"]
    out, err = io.StringIO(), io.StringIO()
    with redirect_stdout(out), redirect_stderr(err):
        try:
            code = news_mod.main(argv)
        except SystemExit as e:
            code = e.code if isinstance(e.code, int) else 1
        except Exception as e:
            return {"status": "DATA UNAVAILABLE", "error": str(e), "items": [], "code": 1}
    text = out.getvalue().strip()
    err_text = err.getvalue().strip()
    if text.startswith("{") or text.startswith("["):
        try:
            doc = json.loads(text)
            # doc may be list of items or dict with items
            items = doc.get("items") if isinstance(doc, dict) and "items" in doc else doc
            if isinstance(items, dict):
                items = [items]
            if not isinstance(items, list):
                items = []
            return {"status": "ok", "items": items, "count": len(items), "raw": doc, "code": code}
        except Exception as e:
            pass
    # Check for no recent news
    if "no recent news" in text.lower() or "nothing new" in text.lower() or code == 1:
        return {"status": "ok", "items": [], "count": 0, "message": "No recent news found.", "rawText": text or err_text}
    # Data unavailable
    if err_text:
        return {"status": "DATA UNAVAILABLE", "error": err_text[:500], "items": [], "rawText": text}
    return {"status": "ok", "items": [], "count": 0, "rawText": text, "code": code}
