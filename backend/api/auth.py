from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
from backend.config import settings
from fastapi import HTTPException, status

pwd_context = CryptContext(schemes=["pbkdf2_sha256", "bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    # bcrypt limit 72 bytes; truncate if needed (passlib workaround)
    if len(password.encode('utf-8')) > 72:
        password = password[:72]
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    if len(plain.encode('utf-8')) > 72:
        plain = plain[:72]
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict, expires_minutes: int = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes or settings.jwt_expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)

def decode_token(token: str):
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
