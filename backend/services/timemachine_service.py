import os
import sys
import importlib.util
import io
import json
import gzip
from contextlib import redirect_stdout, redirect_stderr

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def load_tm():
    path = os.path.join(ROOT, "trader-timemachine", "timemachine.py")
    spec = importlib.util.spec_from_file_location("trader_tm", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

tm_mod = load_tm()

def run(plan_dict=None, symbol=None, entry=None, stop=None, target=None, entry_time=None, date=None, replays=10000, seed=19, window=2, until=None, now=None, offline=None):
    # Build argv for timemachine.py run
    # Prefer passing plan as flags
    argv = ["run", "--json"]
    if plan_dict:
        # Write temp plan and use file? Instead pass via flags
        if plan_dict.get("symbol"):
            argv += ["--symbol", plan_dict["symbol"]]
        if plan_dict.get("date"):
            argv += ["--date", plan_dict["date"]]
        if plan_dict.get("entry"):
            argv += ["--entry", str(plan_dict["entry"])]
        if plan_dict.get("stop"):
            argv += ["--stop", str(plan_dict["stop"])]
        if plan_dict.get("target"):
            argv += ["--target", str(plan_dict["target"])]
        if plan_dict.get("entry_time"):
            argv += ["--entry-time", str(plan_dict["entry_time"])]
        elif plan_dict.get("entryTime"):
            argv += ["--entry-time", str(plan_dict["entryTime"])]
        if plan_dict.get("setup"):
            argv += ["--setup", plan_dict["setup"]]
        if plan_dict.get("interval"):
            argv += ["--interval", plan_dict["interval"]]
    else:
        if symbol:
            argv += ["--symbol", symbol]
        if date:
            argv += ["--date", date]
        if entry is not None:
            argv += ["--entry", str(entry)]
        if stop is not None:
            argv += ["--stop", str(stop)]
        if target is not None:
            argv += ["--target", str(target)]
        if entry_time:
            argv += ["--entry-time", entry_time]
    argv += ["--replays", str(replays), "--seed", str(seed), "--window", str(window)]
    if until:
        argv += ["--until", until]
    if now:
        argv += ["--now", now]
    if offline:
        argv += ["--offline", offline]
    out, err = io.StringIO(), io.StringIO()
    with redirect_stdout(out), redirect_stderr(err):
        try:
            code = tm_mod.main(argv)
        except SystemExit as e:
            code = e.code if isinstance(e.code, int) else 1
        except Exception as e:
            return {"status": "error", "error": str(e), "code": 1}
    text = out.getvalue()
    err_text = err.getvalue()
    full = text.strip()
    if full.startswith("{"):
        try:
            doc = json.loads(full)
            # Enrich with verdict, histogram, etc already in doc
            return {"status": "ok", "code": code, "doc": doc, "raw": doc}
        except Exception as e:
            return {"status": "error", "error": f"JSON parse failed: {e}", "output": full[:2000], "code": 1}
    else:
        # Error case: plain text
        msg = (err_text.strip() or full.strip())[:2000]
        return {"status": "error", "error": msg or "TimeMachine failed", "code": code or 1}

def direct_run(plan_dict, replays=10000, seed=19, window=2, until=None, now=None, offline=None):
    """Direct in-process run using time_machine() function for background jobs, with fixture fallback"""
    import datetime
    # Try to read offline file or fetch live data
    chart_text = None
    symbol = plan_dict.get("symbol", "TSLA")
    if offline and os.path.exists(offline):
        # offline may be a file or folder
        chart_text = tm_mod.read_offline(offline, symbol)
        # read_offline returns text? Check tm impl
        if isinstance(chart_text, tuple):
            chart_text = chart_text[0]
    # If no offline and we are in test/fixture mode, try fixture
    if not chart_text:
        fixture = os.path.join(ROOT, "tests", "fixtures", "trader-timemachine", "TSLA-60d5m.json.gz")
        if os.path.exists(fixture) and symbol == "TSLA":
            import gzip
            with gzip.open(fixture, "rt", encoding="utf-8") as fh:
                chart_text = fh.read()
            now = now or "2026-10-19 10:50"
    if not chart_text:
        # Fallback to live fetch (may fail)
        try:
            chart_text = tm_mod.fetch_chart(symbol)
        except Exception as e:
            return {"status": "error", "error": f"DATA UNAVAILABLE: {e}"}
    # Normalize plan
    try:
        plan = tm_mod.normalize_plan(plan_dict)
    except Exception as e:
        return {"status": "error", "error": str(e)}
    now_utc = tm_mod.parse_now(now) if now else tm_mod.parse_now(None)
    try:
        doc = tm_mod.time_machine(chart_text, plan, now_utc, replays=replays, seed=seed, window=window, until=until)
        return {"status": "ok", "doc": doc}
    except Exception as e:
        return {"status": "error", "error": str(e)}
