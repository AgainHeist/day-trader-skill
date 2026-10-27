import os
from functools import lru_cache
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./trader.db")
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    sec_user_agent: str = os.getenv("SEC_USER_AGENT", "DayTraderWeb you@example.com")
    session_secret: str = os.getenv("SESSION_SECRET", "change-me-in-production-please")
    encryption_key: str = os.getenv("ENCRYPTION_KEY", "change-me-too-please-32chars!!")
    ai_api_key: str = os.getenv("AI_API_KEY", "")
    ai_base_url: str = os.getenv("AI_BASE_URL", "https://api.openai.com/v1")
    ai_model: str = os.getenv("AI_MODEL", "gpt-4o-mini")
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    cors_origins: str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,https://day-trader-web.vercel.app")
    yahoo_pause: float = 0.3
    paper_mode: bool = True
    jwt_secret: str = os.getenv("SESSION_SECRET", "change-me-in-production-please")
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7

    class Config:
        env_file = ".env"
        extra = "ignore"

@lru_cache
def get_settings():
    return Settings()

settings = get_settings()
