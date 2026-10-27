import time
import json
import os

try:
    import redis
    from backend.config import settings
    _redis = None
    try:
        _redis = redis.from_url(settings.redis_url, socket_connect_timeout=2)
        _redis.ping()
    except Exception:
        _redis = None
except ImportError:
    _redis = None

_memory = {}

def get(key):
    if _redis:
        try:
            v = _redis.get(key)
            if v:
                return json.loads(v)
        except Exception:
            pass
    entry = _memory.get(key)
    if not entry:
        return None
    value, expires_at = entry
    if expires_at and time.time() > expires_at:
        _memory.pop(key, None)
        return None
    return value

def set(key, value, ttl=60):
    if _redis:
        try:
            _redis.setex(key, ttl, json.dumps(value))
            return
        except Exception:
            pass
    expires_at = time.time() + ttl if ttl else None
    _memory[key] = (value, expires_at)

def delete(key):
    if _redis:
        try:
            _redis.delete(key)
        except Exception:
            pass
    _memory.pop(key, None)

def cache_key(*parts):
    return ":".join(str(p) for p in parts)
