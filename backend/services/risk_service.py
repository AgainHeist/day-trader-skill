import os
import sys
import importlib.util
import io
import json
from contextlib import redirect_stdout, redirect_stderr

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def load_risk():
    path = os.path.join(ROOT, "trader-risk", "check.py")
    spec = importlib.util.spec_from_file_location("trader_risk", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

risk_mod = load_risk()

def check_orders(orders: list, cfg: dict, portfolio: dict = None, prices: dict = None, state: dict = None, today=None, now=None):
    """Direct check using risk_mod.check()"""
    try:
        result = risk_mod.check(orders, cfg, portfolio=portfolio, prices=prices, state=state, today=today, now=now)
        # result is dict with 'results' list (check.py returns dict) or list in older versions
        if isinstance(result, dict) and "results" in result:
            raw_results = result["results"]
            # Determine pass via counts
            all_pass = result.get("block", 0) == 0 and result.get("pass", 0) > 0
            # Also check explicit verdict strings if present
            normalized = []
            for r in raw_results:
                # check.py uses 'verdict' and 'reasons'
                status = r.get("verdict") or r.get("status") or "BLOCK"
                # Normalize to PASS/BLOCK upper
                if status.upper() == "PASS":
                    status = "PASS"
                elif status.upper() == "BLOCK":
                    status = "BLOCK"
                normalized.append({
                    "symbol": r.get("symbol") or r.get("order", {}).get("symbol") if r.get("order") else r.get("symbol"),
                    "status": status,
                    "reasons": r.get("reasons", []) or r.get("reason", []),
                    "warnings": r.get("warnings", []),
                    "order": r.get("order") or {k: r.get(k) for k in ("symbol","side","qty","type") if r.get(k)},
                    "raw": r,
                })
            # If result says pass==len, then all pass
            if not normalized and isinstance(raw_results, list):
                all_pass = False
            return {"status": "ok", "results": normalized, "allPass": all_pass, "raw": result}
        elif isinstance(result, list):
            normalized = []
            for r in result:
                normalized.append({
                    "symbol": r.get("order", {}).get("symbol") or r.get("symbol"),
                    "status": r.get("status"),
                    "reasons": r.get("reasons", []) or r.get("reason", []),
                    "warnings": r.get("warnings", []),
                    "order": r.get("order"),
                    "raw": r,
                })
            all_pass = all(x["status"] == "PASS" for x in normalized) if normalized else False
            return {"status": "ok", "results": normalized, "allPass": all_pass, "raw": result}
        else:
            return {"status": "ok", "results": [], "allPass": False, "raw": result}
    except Exception as e:
        return {"status": "error", "error": str(e)}

def check_via_cli(orders_path=None, config_path=None, portfolio_path=None, prices_path=None, now=None, no_write=False):
    argv = []
    if orders_path:
        argv += ["--orders", orders_path]
    if config_path:
        argv += ["--config", config_path]
    if portfolio_path:
        argv += ["--portfolio", portfolio_path]
    if prices_path:
        argv += ["--prices", prices_path]
    if now:
        argv += ["--now", now]
    if no_write:
        argv += ["--no-write"]
    argv += ["--json"]
    out, err = io.StringIO(), io.StringIO()
    with redirect_stdout(out), redirect_stderr(err):
        try:
            code = risk_mod.main(argv)
        except SystemExit as e:
            code = e.code if isinstance(e.code, int) else 1
        except Exception as e:
            return {"status": "error", "error": str(e)}
    text = out.getvalue().strip()
    if text.startswith("{") or text.startswith("["):
        try:
            doc = json.loads(text)
            return {"status": "ok", "code": code, "doc": doc}
        except:
            pass
    return {"status": "error" if code != 0 else "ok", "output": text or err.getvalue().strip(), "code": code}
