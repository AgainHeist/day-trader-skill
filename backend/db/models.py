from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.db.database import Base
import datetime

def utcnow():
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(320), unique=True, index=True, nullable=False)
    password_hash = Column(String(512), nullable=False)
    created_at = Column(DateTime, default=utcnow)

class UserSettings(Base):
    __tablename__ = "user_settings"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    data = Column(JSON, default=dict)

class Watchlist(Base):
    __tablename__ = "watchlists"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    name = Column(String(100), default="default")
    created_at = Column(DateTime, default=utcnow)

class WatchlistSymbol(Base):
    __tablename__ = "watchlist_symbols"
    id = Column(Integer, primary_key=True)
    watchlist_id = Column(Integer, ForeignKey("watchlists.id"))
    symbol = Column(String(20), index=True)
    added_at = Column(DateTime, default=utcnow)

class ScannerRun(Base):
    __tablename__ = "scanner_runs"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    mode = Column(String(20))
    status = Column(String(20), default="running")  # running, complete, partial, error
    as_of = Column(String(50))
    universe_count = Column(Integer, default=0)
    scanned = Column(Integer, default=0)
    failed = Column(Integer, default=0)
    hits_count = Column(Integer, default=0)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)

class ScannerResult(Base):
    __tablename__ = "scanner_results"
    id = Column(Integer, primary_key=True)
    run_id = Column(Integer, ForeignKey("scanner_runs.id"), index=True)
    symbol = Column(String(20))
    setup = Column(String(50))
    price = Column(Float)
    setup_time = Column(String(50))
    range_high = Column(Float, nullable=True)
    range_low = Column(Float, nullable=True)
    pct_above = Column(Float, nullable=True)
    volume = Column(Integer, nullable=True)
    data_status = Column(String(30))
    confirmation_status = Column(String(30))
    raw = Column(JSON)

class EntrySetup(Base):
    __tablename__ = "entry_setups"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    symbol = Column(String(20), index=True)
    setup = Column(String(20))
    interval = Column(String(10))
    or_minutes = Column(Integer, default=15)
    level = Column(Float, nullable=True)
    status = Column(String(20))
    entry_price = Column(Float, nullable=True)
    entry_time = Column(String(50), nullable=True)
    range_high = Column(Float, nullable=True)
    range_low = Column(Float, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    raw = Column(JSON)

class ExitPlan(Base):
    __tablename__ = "exit_plans"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    symbol = Column(String(20), index=True)
    entry_price = Column(Float)
    stop_price = Column(Float)
    stop_rule = Column(String(50))
    target_price = Column(Float)
    target_r = Column(Float)
    flat_by = Column(String(20))
    risk_reward = Column(Float)
    raw = Column(JSON)
    created_at = Column(DateTime, default=utcnow)

class TimeMachineRun(Base):
    __tablename__ = "timemachine_runs"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    symbol = Column(String(20))
    status = Column(String(20), default="running")
    replays = Column(Integer, default=10000)
    seed = Column(Integer, default=19)
    progress = Column(Integer, default=0)
    result = Column(JSON, nullable=True)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)

class BudgetCalc(Base):
    __tablename__ = "budget_calculations"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    symbol = Column(String(20))
    shares = Column(Integer)
    position_value = Column(Float)
    max_loss = Column(Float)
    status = Column(String(20))
    raw = Column(JSON)
    created_at = Column(DateTime, default=utcnow)

class RiskCheck(Base):
    __tablename__ = "risk_checks"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(20))  # PASS / BLOCK
    reason = Column(Text, nullable=True)
    raw = Column(JSON)
    created_at = Column(DateTime, default=utcnow)

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    symbol = Column(String(20), nullable=True)
    rule_type = Column(String(30))
    price = Column(Float, nullable=True)
    pct = Column(Float, nullable=True)
    at_time = Column(String(20), nullable=True)
    label = Column(String(100))
    triggered = Column(Boolean, default=False)
    triggered_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    raw = Column(JSON)

class AlertEvent(Base):
    __tablename__ = "alert_events"
    id = Column(Integer, primary_key=True)
    alert_id = Column(Integer, ForeignKey("alerts.id"))
    event_type = Column(String(50))
    price = Column(Float, nullable=True)
    created_at = Column(DateTime, default=utcnow)

class PaperOrder(Base):
    __tablename__ = "paper_orders"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    symbol = Column(String(20))
    side = Column(String(10))
    qty = Column(Integer)
    order_type = Column(String(20))
    limit_price = Column(Float, nullable=True)
    stop_price = Column(Float, nullable=True)
    take_profit = Column(Float, nullable=True)
    status = Column(String(20), default="preview")  # preview, pending_confirm, placed, filled, cancelled
    fingerprint = Column(String(64))
    raw = Column(JSON)
    created_at = Column(DateTime, default=utcnow)

class PaperPosition(Base):
    __tablename__ = "paper_positions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    symbol = Column(String(20), unique=False)
    qty = Column(Integer)
    avg_price = Column(Float)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

class SystemEvent(Base):
    __tablename__ = "system_events"
    id = Column(Integer, primary_key=True)
    module = Column(String(50))
    level = Column(String(20))
    message = Column(Text)
    created_at = Column(DateTime, default=utcnow)
