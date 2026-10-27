import os
import sys
import importlib.util
import io
import json
from contextlib import redirect_stdout, redirect_stderr

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def load_budget():
    path = os.path.join(ROOT, "trader-budget", "size.py")
    spec = importlib.util.spec_from_file_location("trader_budget", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

budget_mod = load_budget()

def calculate(plan=None, budget=None, limit=None, price=None, cash=None, cfg_path=None, prices_path=None, now=None):
    argv = []
    if plan:
        # plan is dict; we can write temp file or pass via --entry etc? Easier: write to trader/plan.json and call size.py
        # For API we pass budget/limit directly via argv; size.py reads trader/plan.json by default
        # We'll temporarily write trader/plan.json if it doesn't exist
        import tempfile
        os.makedirs("trader", exist_ok=True)
        # Only write if plan file missing or we want to override
        # We'll set budget via --budget flag if available
        pass
    # size.py main args
    if budget is not None:
        argv += ["--budget", str(budget)]
    if limit is not None:
        argv += ["--limit", str(limit)]
    # Note: size.py uses trader/plan.json + trader/config.json by default
    if cfg_path:
        argv += ["--config", cfg_path]
    if prices_path:
        argv += ["--prices", prices_path]
    if now:
        argv += ["--now", now]
    argv += ["--json"]
    # If plan passed as dict, we need to handle: write temp trader/plan.json, run, restore
    backup = None
    plan_path = os.path.join("trader", "plan.json")
    if plan:
        if os.path.exists(plan_path):
            with open(plan_path, encoding="utf-8") as fh:
                backup = fh.read()
        os.makedirs("trader", exist_ok=True)
        with open(plan_path, "w", encoding="utf-8") as fh:
            json.dump(plan, fh)
    out, err = io.StringIO(), io.StringIO()
    with redirect_stdout(out), redirect_stderr(err):
        try:
            code = budget_mod.main(argv)
        except SystemExit as e:
            code = e.code if isinstance(e.code, int) else 1
        except Exception as e:
            return {"status": "error", "error": str(e), "code": 1}
        finally:
            if plan and backup is not None:
                with open(plan_path, "w", encoding="utf-8") as fh:
                    fh.write(backup)
            elif plan and backup is None:
                # remove the temp we created if it wasn't there before
                try:
                    os.remove(plan_path)
                except:
                    pass
    text = out.getvalue().strip()
    err_text = err.getvalue().strip()
    if text.startswith("{"):
        try:
            doc = json.loads(text)
            # doc contains orders etc
            return {"status": "ok", "code": code, "doc": doc, "raw": doc}
        except:
            pass
    # Even if not JSON, try to parse report
    combined = text or err_text
    # The size.py --json should output JSON; if not, treat as error
    return {"status": "error" if code != 0 else "ok", "error": (err_text or text)[:2000], "output": combined[:2000], "code": code}

def calculate_with_config(plan_dict, cfg: dict, budget_override=None, now=None):
    """Direct call using size_trade() without subprocess"""
    # Ensure plan has required fields
    # budget_mod.size_trade(plan, cfg, budget=..., limit=..., price=..., cash=...)
    # Need to mock reading config; we pass cfg dict directly
    try:
        # Convert plan_dict to expected shape if needed
        # size_trade expects plan with entry, stop, etc.
        # It reads from trader/plan.json if plan not passed; but we can call size_trade directly
        # Let's use the function directly
        budget_val = budget_override if budget_override is not None else cfg.get("budget", 5000)
        result = budget_mod.size_trade(plan_dict, cfg, budget=budget_val, limit=None, price=None, cash=None, today=None)
        # result is a dict with shares, etc ; then build order
        order = budget_mod.bracket_order(result) if result else None
        return {"status": "ok", "result": result, "order": order}
    except budget_mod.SizeError as e:
        return {"status": "error", "error": str(e)}
    except Exception as e:
        return {"status": "error", "error": str(e)}
