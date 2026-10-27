import os
import sys
import importlib.util
import io
import json
from contextlib import redirect_stdout, redirect_stderr

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def load_exit():
    path = os.path.join(ROOT, "trader-exit", "exit.py")
    spec = importlib.util.spec_from_file_location("trader_exit", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

exit_mod = load_exit()

def plan(symbol=None, entry=None, or_high=None, or_low=None, stop="or-mid", target="1R", level=None, setup="orb", interval="5m", now=None, offline=None, flat_by=None, entry_time=None):
    argv = ["plan"]
    if symbol:
        argv += ["--symbol", symbol.upper()]
    if entry is not None:
        argv += ["--entry", str(entry)]
    if or_high is not None:
        argv += ["--or-high", str(or_high)]
    if or_low is not None:
        argv += ["--or-low", str(or_low)]
    if stop:
        argv += ["--stop", str(stop)]
    if target:
        argv += ["--target", str(target)]
    if level is not None:
        argv += ["--level", str(level)]
    if setup:
        argv += ["--setup", setup]
    if interval:
        argv += ["--interval", interval]
    if now:
        argv += ["--now", now]
    if offline:
        argv += ["--offline", offline]
    if flat_by:
        argv += ["--flat-by", flat_by]
    if entry_time:
        argv += ["--entry-time", entry_time]
    argv += ["--json"]
    # Create a temp trader/entry.json if needed? exit.py reads trader/entry.json when no --entry
    out, err = io.StringIO(), io.StringIO()
    with redirect_stdout(out), redirect_stderr(err):
        try:
            code = exit_mod.main(argv)
        except SystemExit as e:
            code = e.code if isinstance(e.code, int) else 1
        except Exception as e:
            return {"status": "error", "error": str(e), "code": 1}
    text = out.getvalue().strip()
    if text.startswith("{"):
        try:
            doc = json.loads(text)
            # Add computed fields for API
            return {
                "status": "ok",
                "code": code,
                "entry": doc.get("entry"),
                "stop": doc.get("stop"),
                "stopRule": doc.get("stop_rule"),
                "stopLabel": doc.get("stop_label"),
                "target": doc.get("target"),
                "targetR": doc.get("target_r"),
                "targetLabel": doc.get("target_label"),
                "riskPerShare": doc.get("risk_per_share"),
                "rewardRisk": doc.get("reward_risk"),
                "flatBy": doc.get("flat_by"),
                "openingRange": doc.get("opening_range"),
                "symbol": doc.get("symbol") or (symbol.upper() if symbol else None),
                "raw": doc,
                "code": code,
            }
        except Exception as e:
            pass
    err_text = err.getvalue().strip() or text
    return {"status": "error", "error": err_text or "Exit plan failed", "code": code or 1}
