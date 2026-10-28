from typing import Dict, List
from fastapi import WebSocket
import json
import asyncio

class ConnectionManager:
    def __init__(self):
        self.active: List[WebSocket] = []
        self.lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self.lock:
            self.active.append(websocket)

    async def disconnect(self, websocket: WebSocket):
        async with self.lock:
            if websocket in self.active:
                self.active.remove(websocket)

    async def broadcast(self, event: dict):
        """Broadcast event to all connected clients"""
        message = json.dumps(event)
        dead = []
        async with self.lock:
            clients = list(self.active)
        for ws in clients:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            await self.disconnect(ws)

    async def send_to(self, websocket: WebSocket, event: dict):
        try:
            await websocket.send_text(json.dumps(event))
        except Exception:
            pass

manager = ConnectionManager()

# Helper to emit typed events
async def emit(event_type: str, data: dict = None, **kwargs):
    payload = {"type": event_type, "timestamp": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(), **kwargs}
    if data is not None:
        payload["data"] = data
    await manager.broadcast(payload)
