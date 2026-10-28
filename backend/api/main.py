from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from backend.config import settings
from backend.db.database import init_db
from backend.db import models
import os

app = FastAPI(
    title="ALi BOSS - Premium Trading Terminal API",
    description="ALi BOSS Premium Terminal - Production backend for Day Trader Skill - 11 modules, real Yahoo/SEC/House data, no fake values - Power By ALi",
    version="2.0.0",
)

# CORS — allow localhost + preview hosts + vercel
origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
for dev in ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]:
    if dev not in origins:
        origins.append(dev)
# Allow all origins for preview/sandbox (credentials disabled to allow wildcard)
is_preview = any("e2b.app" in o for o in origins) or os.getenv("E2B_SANDBOX") == "true"
if is_preview:
    # Use wildcard with proper config for preview — allow all origins
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"https://.*\.e2b\.app",
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins if origins != ["*"] else ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins if origins != ["*"] else ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Init DB on startup
@app.on_event("startup")
async def startup():
    try:
        init_db()
    except Exception as e:
        print(f"DB init error: {e}")

# Routers
from backend.api.routers.health import router as health_router
from backend.api.routers.market import router as market_router
from backend.api.routers.scanner import router as scanner_router
from backend.api.routers.news import router as news_router
from backend.api.routers.entry import router as entry_router
from backend.api.routers.exit import router as exit_router
from backend.api.routers.timemachine import router as tm_router
from backend.api.routers.budget import router as budget_router
from backend.api.routers.risk import router as risk_router
from backend.api.routers.alerts import router as alerts_router
from backend.api.routers.analyst import router as analyst_router
from backend.api.routers.pelosi import router as pelosi_router
from backend.api.routers.paper import router as paper_router
from backend.api.routers.settings import router as settings_router
from backend.api.routers.auth_router import router as auth_router

app.include_router(health_router, prefix="/api", tags=["system"])
app.include_router(market_router, prefix="/api", tags=["market"])
app.include_router(scanner_router, prefix="/api", tags=["scanner"])
app.include_router(news_router, prefix="/api", tags=["news"])
app.include_router(entry_router, prefix="/api", tags=["entry"])
app.include_router(exit_router, prefix="/api", tags=["exit"])
app.include_router(tm_router, prefix="/api", tags=["timemachine"])
app.include_router(budget_router, prefix="/api", tags=["budget"])
app.include_router(risk_router, prefix="/api", tags=["risk"])
app.include_router(alerts_router, prefix="/api", tags=["alerts"])
app.include_router(analyst_router, prefix="/api", tags=["analyst"])
app.include_router(pelosi_router, prefix="/api", tags=["pelosi"])
app.include_router(paper_router, prefix="/api", tags=["paper"])
app.include_router(settings_router, prefix="/api", tags=["settings"])
app.include_router(auth_router, prefix="/api", tags=["auth"])

@app.get("/")
def root():
    return {"name": "Day Trader Web API", "version": "2.0.0", "docs": "/docs", "health": "/api/health", "paperMode": True}

# WebSocket
from backend.api.websocket_manager import manager as ws_manager
import json
import asyncio

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Send welcome
        await ws_manager.send_to(websocket, {"type": "system.status", "status": "Connected", "paperMode": True, "message": "WebSocket connected"})
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await ws_manager.send_to(websocket, {"type": "pong", "timestamp": msg.get("timestamp")})
                elif msg.get("type") == "subscribe":
                    await ws_manager.send_to(websocket, {"type": "subscribed", "channel": msg.get("channel")})
                else:
                    # Echo for debugging
                    await ws_manager.send_to(websocket, {"type": "echo", "data": msg})
            except:
                await ws_manager.send_to(websocket, {"type": "echo", "data": data})
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception:
        try:
            await ws_manager.disconnect(websocket)
        except: pass

@app.websocket("/api/ws")
async def websocket_api_endpoint(websocket: WebSocket):
    await websocket_endpoint(websocket)

# Add /api/system/status alias already via health router
