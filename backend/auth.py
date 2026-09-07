import os
import secrets
import bcrypt
from datetime import datetime, timedelta
from jose import JWTError, jwt
from db import get_user, create_user, get_all_users

# No hardcoded fallback: this file is public (the Hugging Face Space deploys
# from a public repo), and a known signing key lets anyone mint a valid token
# for any account. Falling back to a random per-process key instead keeps local
# development working -- tokens simply stop being valid across a restart --
# while making a misconfigured deployment fail closed rather than wide open.
SECRET_KEY = os.getenv("JWT_SECRET")
if not SECRET_KEY:
    SECRET_KEY = secrets.token_urlsafe(48)
    print("WARNING: JWT_SECRET is not set. Using a random key for this process; "
          "logins will not survive a restart. Set JWT_SECRET in the deployment "
          "environment (on Hugging Face: Settings -> Variables and secrets).")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24


def _pb(s):
    return s.encode("utf-8")[:72]


def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(_pb(plain_password), hashed_password.encode("utf-8"))


def get_password_hash(password):
    return bcrypt.hashpw(_pb(password), bcrypt.gensalt()).decode("utf-8")


def load_users():
    return get_all_users()


def save_user(username, email, hashed_password):
    create_user(username, email, hashed_password)


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
