#!/usr/bin/env python3
"""
Termux / Python 3.14 fallback - no FastAPI/pydantic/Rust needed.
Pure stdlib: serves same API shape for preview on phone.

Run: python backend/simple_server.py
Then open: http://localhost:8000/api/health
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import os
import sys
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

def load_scan():
    import importlib.util
    path = os.path.join(ROOT, "trader-scanner", "scan.py")
    spec = importlib.util.spec_from_file_location("trader_scan", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        sys.stderr.write("%s - - [%s] %s\n" % (self.client_address[0], self.log_date_time_string(), format%args))

    def send_json(self, data, code=200):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type,Authorization")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_json({}, 200)

    def do_GET(self):
        p = urllib.parse.urlparse(self.path)
        path = p.path
        qs = urllib.parse.parse_qs(p.query)

        if path in ("/", "/api/health", "/api/system/status"):
            self.send_json({"status":"ok","database":"ok","redis":"not_configured","workers":"ok","websocket":"ok","paperMode":True})
        elif path == "/api/market/status":
            self.send_json({"status":"CLOSED","et_time":"2026-10-27 19:44 ET","is_open":False,"next_open":"09:30 ET next trading day"})
        elif path.startswith("/api/market/quote/"):
            sym = path.split("/")[-1].upper()
            self.send_json({"symbol":sym,"price":None,"status":"DATA UNAVAILABLE","error":"Use real server for live quotes","source":"yahoo"})
        elif path.startswith("/api/market/chart/"):
            self.send_json({"symbol":path.split("/")[-1].upper(),"bars":[],"status":"DATA UNAVAILABLE"})
        elif path.startswith("/api/scanner/status"):
            self.send_json([{"id":1,"mode":"orb","status":"partial","scanned":231,"failed":1,"hits":42}])
        elif path.startswith("/api/scanner/results"):
            self.send_json({"runId":1,"status":"partial","hits":[{"symbol":"TSLA","setup":"orb","price":364.18}],"scanned":231,"failed":1})
        elif path.startswith("/api/news/"):
            self.send_json({"symbol":path.split("/")[-1].upper(),"items":[],"count":0,"status":"ok","message":"No recent news found."})
        elif path.startswith("/api/analyst/"):
            self.send_json({"symbol":path.split("/")[-1].upper(),"status":"DATA UNAVAILABLE","error":"SEC data requires live server"})
        elif path.startswith("/api/pelosi"):
            self.send_json({"status":"ok","filings":[],"count":0,"disclaimer":"PUBLIC DISCLOSURE DATA - Members must disclose trades within 30-45 days. Not inside information."})
        elif path.startswith("/api/paper/positions"):
            self.send_json({"positions":[],"count":0,"paperMode":True})
        elif path.startswith("/api/paper/orders"):
            self.send_json({"orders":[],"count":0,"paperMode":True})
        elif path.startswith("/api/paper/balance"):
            self.send_json({"cash":5000,"marketValue":0,"totalEquity":5000,"paperMode":True})
        elif path.startswith("/api/alerts"):
            self.send_json([])
        elif path.startswith("/api/auth/watchlist"):
            self.send_json({"watchlistId":1,"symbols":[]})
        elif path.startswith("/api/settings"):
            self.send_json({"sec":{"userAgent":"ALi BOSS"},"scanner":{"minPrice":5,"orMinutes":15},"risk":{"budget":5000}})
        elif path == "/api/market/indices":
            self.send_json({"^GSPC":{"price":None,"status":"DATA UNAVAILABLE"}})
        else:
            self.send_json({"error":"Not found on simple_server, use full server on Render/Vercel: "+path},404)

    def do_POST(self):
        p = urllib.parse.urlparse(self.path)
        path = p.path
        length = int(self.headers.get('content-length',0))
        body = self.rfile.read(length).decode() if length else "{}"
        try:
            data = json.loads(body) if body else {}
        except:
            data = {}

        if path == "/api/scanner/run":
            self.send_json({"runId":1,"status":"running","mode":data.get("mode","orb"),"message":"Scanner started (simple_server preview)"})
        elif path == "/api/entry/check":
            sym = data.get("symbol","TSLA")
            self.send_json({"symbol":sym.upper(),"status":"TRIGGERED","setup":"orb","price":364.18,"rangeHigh":362.18,"raw":{"status":"triggered"}})
        elif path == "/api/exit/plan":
            self.send_json({"status":"ok","entry":364.18,"stop":358.32,"stopRule":"or_mid","target":370.04,"targetR":1.0,"symbol":data.get("symbol","TSLA")})
        elif path == "/api/budget/calculate":
            self.send_json({"shares":8,"totalValue":2913.44,"maxLoss":46.88,"positionValue":2913.44,"order":{"symbol":data.get("symbol","TSLA"),"qty":"8"}})
        elif path == "/api/risk/check":
            self.send_json({"status":"BLOCK","allPass":False,"results":[{"symbol":"TSLA","status":"BLOCK","reasons":["window: market is closed"]}],"message":"BLOCKED: market is closed"})
        elif path == "/api/alerts":
            self.send_json({"status":"ok","alert":{"symbol":data.get("symbol","TSLA")}})
        elif path == "/api/timemachine/run":
            self.send_json({"runId":1,"status":"running","replays":data.get("replays",10000),"message":"SIMULATION - NOT A GUARANTEE"})
        elif path == "/api/paper/order-preview":
            self.send_json({"status":"ok","orders":[{"symbol":"TSLA","side":"buy","qty":8}],"count":1,"paperMode":True})
        elif path == "/api/paper/order-confirm":
            self.send_json({"status":"ok","message":"Paper order placed (simulation)"})
        elif path.startswith("/api/auth/"):
            if "signup" in path or "login" in path:
                self.send_json({"status":"ok","user":{"id":1,"email":data.get("email","test@example.com")},"token":"demo-token"})
            else:
                self.send_json({"status":"ok"})
        elif path == "/api/settings":
            self.send_json({"status":"ok","settings":data})
        elif path == "/api/settings/ai":
            self.send_json({"status":"ok"})
        else:
            self.send_json({"status":"ok","preview":True,"note":"simple_server preview - deploy to Render for full real data"})

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    print(f"ALi BOSS simple server on http://0.0.0.0:{port}")
    print(f"Health: http://localhost:{port}/api/health")
    print("Note: This is TERMUX preview (no Rust). For 100% real data deploy to Render.")
    HTTPServer(("0.0.0.0", port), Handler).serve_forever()
