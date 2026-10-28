import os
import sys
import importlib.util
import io
import json
from contextlib import redirect_stdout, redirect_stderr

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def load_alerts():
    path = os.path.join(ROOT, "trader-alerts", "alerts.py")
    spec = importlib.util.spec_from_file_location("trader_alerts", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

alerts_mod = load_alerts()

def list_alerts():
    # Read from trader/alerts.json or trader/state/alerts.json
    for p in ["trader/alerts.json", "trader/state/alerts.json", "trader/alerts.example.json"]:
        if os.path.exists(p):
            try:
                with open(p, encoding="utf-8") as fh:
                    data = json.load(fh)
                rules = data.get("rules") if isinstance(data, dict) and "rules" in data else data
                if isinstance(rules, list):
                    return {"status": "ok", "alerts": rules, "count": len(rules)}
                elif isinstance(rules, dict):
                    return {"status": "ok", "alerts": [rules], "count": 1}
            except:
                pass
    return {"status": "ok", "alerts": [], "count": 0}

def add_alert(rule: dict):
    # Validate via alerts_mod.validate
    try:
        alerts_mod.validate(rule)
    except Exception as e:
        return {"status": "error", "error": str(e)}
    # Append to trader/alerts.json
    path = "trader/alerts.json"
    data = {"rules": []}
    if os.path.exists(path):
        try:
            with open(path, encoding="utf-8") as fh:
                data = json.load(fh)
            if isinstance(data, list):
                data = {"rules": data}
        except:
            pass
    data.setdefault("rules", []).append(rule)
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2)
    return {"status": "ok", "alert": rule}

def check_alerts(now=None, offline=None):
    argv = ["check"]
    if now:
        argv += ["--now", now]
    if offline:
        argv += ["--offline", offline]
    argv += ["--json"]
    out, err = io.StringIO(), io.StringIO()
    with redirect_stdout(out), redirect_stderr(err):
        try:
            code = alerts_mod.main(argv)
        except SystemExit as e:
            code = e.code if isinstance(e.code, int) else 1
        except Exception as e:
            return {"status": "error", "error": str(e)}
    text = out.getvalue().strip()
    if text.startswith("{") or text.startswith("["):
        try:
            doc = json.loads(text)
            return {"status": "ok", "code": code, "doc": doc, "raw": text}
        except:
            pass
    return {"status": "ok" if code == 0 else "no_triggers", "output": text or err.getvalue().strip(), "code": code}

def clock():
    argv = ["clock", "--json"]
    out, err = io.StringIO(), io.StringIO()
    with redirect_stdout(out), redirect_stderr(err):
        try:
            alerts_mod.main(argv)
        except SystemExit:
            pass
        except Exception as e:
            return {"status": "error", "error": str(e)}
    text = out.getvalue().strip()
    if text.startswith("{"):
        try:
            return json.loads(text)
        except:
            pass
    return {"status": text or err.getvalue().strip()}
