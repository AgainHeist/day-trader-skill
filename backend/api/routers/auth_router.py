from fastapi import APIRouter, Depends, HTTPException, Body, status
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.db.models import User, Watchlist, UserSettings
from backend.api.auth import hash_password, verify_password, create_access_token
from backend.api.deps import get_current_user
import re

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup")
def signup(body: dict = Body(...), db: Session = Depends(get_db)):
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")
    if not re.match(r"^[^@]+@[^@]+\.[^@]+$", email):
        raise HTTPException(status_code=400, detail="Invalid email")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(email=email, password_hash=hash_password(password))
    db.add(user)
    db.commit()
    db.refresh(user)
    # Create default watchlist
    wl = Watchlist(user_id=user.id, name="default")
    db.add(wl)
    db.commit()
    token = create_access_token({"sub": str(user.id), "email": user.email})
    return {"status": "ok", "user": {"id": user.id, "email": user.email}, "token": token}

@router.post("/login")
def login(body: dict = Body(...), db: Session = Depends(get_db)):
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": str(user.id), "email": user.email})
    return {"status": "ok", "user": {"id": user.id, "email": user.email}, "token": token}

@router.post("/logout")
def logout(user=Depends(get_current_user)):
    return {"status": "ok", "message": "Logged out"}

@router.get("/me")
def me(user=Depends(get_current_user)):
    return {"id": user.id, "email": user.email, "createdAt": user.created_at.isoformat() if user.created_at else None}

@router.get("/watchlist")
def get_watchlist(db: Session = Depends(get_db), user=Depends(get_current_user)):
    from backend.db.models import WatchlistSymbol
    wl = db.query(Watchlist).filter(Watchlist.user_id == user.id).first()
    if not wl:
        wl = Watchlist(user_id=user.id, name="default")
        db.add(wl)
        db.commit()
        db.refresh(wl)
    symbols = db.query(WatchlistSymbol).filter(WatchlistSymbol.watchlist_id == wl.id).all()
    return {"watchlistId": wl.id, "symbols": [{"symbol": s.symbol, "addedAt": s.added_at.isoformat() if s.added_at else None, "id": s.id} for s in symbols]}

@router.post("/watchlist")
def add_to_watchlist(body: dict = Body(...), db: Session = Depends(get_db), user=Depends(get_current_user)):
    from backend.db.models import WatchlistSymbol
    symbol = (body.get("symbol") or body.get("ticker") or "").strip().upper()
    if not symbol:
        raise HTTPException(status_code=400, detail="symbol required")
    if not re.match(r"^[A-Z\.]{1,6}$", symbol):
        raise HTTPException(status_code=400, detail="Invalid symbol")
    wl = db.query(Watchlist).filter(Watchlist.user_id == user.id).first()
    if not wl:
        wl = Watchlist(user_id=user.id, name="default")
        db.add(wl)
        db.commit()
        db.refresh(wl)
    exists = db.query(WatchlistSymbol).filter(WatchlistSymbol.watchlist_id == wl.id, WatchlistSymbol.symbol == symbol).first()
    if exists:
        return {"status": "ok", "message": "Already in watchlist", "symbol": symbol}
    ws = WatchlistSymbol(watchlist_id=wl.id, symbol=symbol)
    db.add(ws)
    db.commit()
    return {"status": "ok", "symbol": symbol}

@router.delete("/watchlist/{symbol}")
def remove_from_watchlist(symbol: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    from backend.db.models import WatchlistSymbol
    symbol = symbol.upper()
    wl = db.query(Watchlist).filter(Watchlist.user_id == user.id).first()
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    row = db.query(WatchlistSymbol).filter(WatchlistSymbol.watchlist_id == wl.id, WatchlistSymbol.symbol == symbol).first()
    if not row:
        raise HTTPException(status_code=404, detail="Symbol not in watchlist")
    db.delete(row)
    db.commit()
    return {"status": "ok", "deleted": symbol}
