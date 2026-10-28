import os
import sys
import importlib.util
import json
import datetime
import hashlib

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def load_ticket():
    path = os.path.join(ROOT, "trader-broker", "ticket.py")
    spec = importlib.util.spec_from_file_location("trader_ticket", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

ticket_mod = load_ticket()

def show_tickets(cfg=None, today=None):
    # ticket.py show reads trader/orders.json, trader/state/risk.json, trader/state/broker.json
    # We'll try to call render directly
    # For API, we need to list orders + their status (READY or not)
    orders_path = "trader/orders.json"
    if not os.path.exists(orders_path):
        return {"status": "ok", "tickets": [], "count": 0}
    try:
        with open(orders_path, encoding="utf-8") as fh:
            orders_data = json.load(fh)
        # orders_data may be dict with "orders" list or list itself
        orders = orders_data.get("orders") if isinstance(orders_data, dict) else orders_data
        if not isinstance(orders, list):
            orders = [orders_data] if isinstance(orders_data, dict) and orders_data.get("symbol") else []
        cfg = cfg or {}
        # Load risk state
        risk_path = "trader/state/risk.json"
        state_path = "trader/state/broker.json"
        risk = {}
        state = {"decisions": []}
        if os.path.exists(risk_path):
            with open(risk_path, encoding="utf-8") as fh:
                risk = json.load(fh)
        if os.path.exists(state_path):
            with open(state_path, encoding="utf-8") as fh:
                state = json.load(fh)
        today_str = today or datetime.date.today().isoformat()
        tickets = []
        for idx, order in enumerate(orders, start=1):
            try:
                status = ticket_mod.status_of(order, risk, state, today_str)
                plain = ticket_mod.plain(order)
                max_loss = ticket_mod.max_loss(order) if ticket_mod.is_bracket(order) else None
                tickets.append({
                    "index": idx,
                    "symbol": order.get("symbol"),
                    "side": order.get("side"),
                    "qty": order.get("qty"),
                    "status": status,  # READY / BLOCKED / etc
                    "plain": plain,
                    "maxLoss": max_loss,
                    "order": order,
                    "ready": status == "READY",
                })
            except Exception as e:
                tickets.append({"index": idx, "symbol": order.get("symbol"), "error": str(e), "order": order})
        return {"status": "ok", "tickets": tickets, "count": len(tickets)}
    except Exception as e:
        return {"status": "error", "error": str(e)}

def approve_ticket(index: int, reply: str):
    # Use ticket.py approve logic; we manually check and write state
    orders_path = "trader/orders.json"
    state_path = "trader/state/broker.json"
    risk_path = "trader/state/risk.json"
    if not os.path.exists(orders_path):
        return {"status": "error", "error": "No orders to approve"}
    with open(orders_path, encoding="utf-8") as fh:
        data = json.load(fh)
    orders = data.get("orders") if isinstance(data, dict) else data
    if not isinstance(orders, list):
        orders = [data]
    if index < 1 or index > len(orders):
        return {"status": "error", "error": f"Order index {index} out of range"}
    order = orders[index-1]
    # Load risk/state
    risk = {}
    if os.path.exists(risk_path):
        with open(risk_path, encoding="utf-8") as fh:
            risk = json.load(fh)
    state = {"decisions": []}
    if os.path.exists(state_path):
        with open(state_path, encoding="utf-8") as fh:
            state = json.load(fh)
    today = datetime.date.today().isoformat()
    # Use ticket_mod.parse_yes to validate reply
    try:
        # Check status must be READY
        status = ticket_mod.status_of(order, risk, state, today)
        if status != "READY":
            return {"status": "BLOCK", "error": f"Order is not READY (status: {status})", "order": order}
        ok = ticket_mod.parse_yes(reply, order)
        if not ok:
            return {"status": "BLOCK", "error": "Reply must be an explicit 'yes' for that exact order. Refusing 'yes to all', vague or conditional answers.", "order": order}
        # Record decision
        # Use ticket_mod logic to write state
        import time
        now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
        # Create decision entry
        fp = ticket_mod.fingerprint(order)
        decision = {
            "date": today,
            "fingerprint": fp,
            "symbol": order.get("symbol"),
            "decision": "approve",
            "reply": reply,
            "at": now.isoformat() + "Z",
        }
        state.setdefault("decisions", []).append(decision)
        os.makedirs(os.path.dirname(state_path), exist_ok=True)
        with open(state_path, "w", encoding="utf-8") as fh:
            json.dump(state, fh, indent=2)
        return {"status": "ok", "message": "Order approved. Awaiting broker execution (paper).", "order": order, "decision": decision}
    except Exception as e:
        return {"status": "error", "error": str(e)}

def decline_ticket(index: int, reply: str = "no"):
    orders_path = "trader/orders.json"
    state_path = "trader/state/broker.json"
    if not os.path.exists(orders_path):
        return {"status": "error", "error": "No orders"}
    with open(orders_path, encoding="utf-8") as fh:
        data = json.load(fh)
    orders = data.get("orders") if isinstance(data, dict) else data
    if not isinstance(orders, list):
        orders = [data]
    if index < 1 or index > len(orders):
        return {"status": "error", "error": "Index out of range"}
    order = orders[index-1]
    # Write decline decision
    import datetime as dt
    state = {"decisions": []}
    if os.path.exists(state_path):
        with open(state_path, encoding="utf-8") as fh:
            state = json.load(fh)
    fp = ticket_mod.fingerprint(order)
    decision = {
        "date": dt.date.today().isoformat(),
        "fingerprint": fp,
        "symbol": order.get("symbol"),
        "decision": "decline",
        "reply": reply,
        "at": dt.datetime.now(dt.timezone.utc).replace(tzinfo=None).isoformat() + "Z",
    }
    state.setdefault("decisions", []).append(decision)
    os.makedirs(os.path.dirname(state_path), exist_ok=True)
    with open(state_path, "w", encoding="utf-8") as fh:
        json.dump(state, fh, indent=2)
    return {"status": "ok", "message": "Order declined", "decision": decision}
