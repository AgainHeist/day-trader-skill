import os
import sys
import importlib.util
import io
import json

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def load_ptr():
    path = os.path.join(ROOT, "trader-pelosi", "ptr.py")
    spec = importlib.util.spec_from_file_location("trader_ptr", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

ptr_mod = load_ptr()

def index(member=None, year=None, kind="P", since=None, offline=None):
    argv = ["index"]
    if member:
        argv += ["--member", member]
    if year:
        argv += ["--year", str(year)]
    if kind:
        argv += ["--type", kind]
    if since:
        argv += ["--since", since]
    if offline:
        argv += ["--offline", offline]
    argv += ["--json"]
    out, err = io.StringIO(), io.StringIO()
    from contextlib import redirect_stdout, redirect_stderr
    with redirect_stdout(out), redirect_stderr(err):
        try:
            code = ptr_mod.main(argv)
        except SystemExit as e:
            code = e.code if isinstance(e.code, int) else 0
        except Exception as e:
            return {"status": "DATA UNAVAILABLE", "error": str(e)}
    text = out.getvalue().strip()
    err_text = err.getvalue().strip()
    if text.startswith("{") or text.startswith("["):
        try:
            doc = json.loads(text)
            # doc may be list of rows
            rows = doc if isinstance(doc, list) else doc.get("rows", doc.get("filings", []))
            if isinstance(rows, list):
                return {"status": "ok", "filings": rows, "count": len(rows), "raw": doc}
            return {"status": "ok", "data": doc}
        except:
            pass
    # Try plain text parsing fallback
    if err_text and "no" in err_text.lower():
        return {"status": "ok", "filings": [], "count": 0, "message": err_text}
    if text:
        # Might be plain text report
        return {"status": "ok", "rawText": text, "count": 0}
    return {"status": "DATA UNAVAILABLE", "error": err_text[:500] or text[:500]}

def fetch_report(doc_id: str, offline=None):
    argv = ["fetch", str(doc_id)]
    if offline:
        argv += ["--offline", offline]
    argv += ["--json"]
    out, err = io.StringIO(), io.StringIO()
    from contextlib import redirect_stdout, redirect_stderr
    with redirect_stdout(out), redirect_stderr(err):
        try:
            code = ptr_mod.main(argv)
        except SystemExit as e:
            code = e.code if isinstance(e.code, int) else 0
        except Exception as e:
            return {"status": "error", "error": str(e)}
    text = out.getvalue().strip()
    if text.startswith("{") or text.startswith("["):
        try:
            doc = json.loads(text)
            return {"status": "ok", "report": doc}
        except:
            pass
    return {"status": "ok" if text else "DATA UNAVAILABLE", "rawText": text, "error": err.getvalue().strip()}
