import os
import json
import numpy as np
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timezone

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "crop_disease")
DB_USER = os.getenv("DB_USER", "app")
DB_PASSWORD = os.getenv("DB_PASSWORD", "app_password")

# Hosted Postgres (Neon, Supabase, Render) hands out one connection string and
# refuses plain connections, so DATABASE_URL wins when present and SSL is
# required by default for it. Local Docker Postgres has no TLS, hence "prefer"
# as the default for the host/port form.
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
DB_SSLMODE = os.getenv("DB_SSLMODE", "require" if DATABASE_URL else "prefer")

# A serverless database sleeps when idle; the first connection after that wakes
# it, which takes a few seconds. Fail slowly rather than reporting it as down.
CONNECT_TIMEOUT = int(os.getenv("DB_CONNECT_TIMEOUT", "15"))


def _as_utc_iso(value):
    """Postgres TIMESTAMP columns come back naive, and NOW() records UTC. Sending
    "2026-09-24T07:28:10" makes every client read it as *local* time, which put
    each check 5h45m early in Nepal. Stamp the zone the value actually has."""
    if value is None:
        return ""
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat()


def get_conn():
    if DATABASE_URL:
        return psycopg2.connect(
            DATABASE_URL, sslmode=DB_SSLMODE, connect_timeout=CONNECT_TIMEOUT
        )
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        sslmode=DB_SSLMODE,
        connect_timeout=CONNECT_TIMEOUT,
    )


def init_db():
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS predictions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                username TEXT NOT NULL REFERENCES users(username),
                timestamp TIMESTAMP DEFAULT NOW(),
                disease TEXT NOT NULL,
                disease_np TEXT DEFAULT '',
                confidence REAL NOT NULL,
                crop_type TEXT DEFAULT '',
                is_unknown BOOLEAN DEFAULT FALSE,
                not_leaf BOOLEAN DEFAULT FALSE,
                message TEXT DEFAULT '',
                cause TEXT DEFAULT '',
                cause_np TEXT DEFAULT '',
                symptoms TEXT DEFAULT '',
                symptoms_np TEXT DEFAULT '',
                treatment TEXT DEFAULT '',
                treatment_np TEXT DEFAULT '',
                prevention TEXT DEFAULT '',
                prevention_np TEXT DEFAULT '',
                top_5_predictions TEXT DEFAULT '[]',
                gradcam_image TEXT DEFAULT '',
                thumbnail TEXT DEFAULT ''
            );
        """)
        conn.commit()
    finally:
        conn.close()


def get_user(username):
    conn = get_conn()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM users WHERE username = %s", (username,))
        return cur.fetchone()
    finally:
        conn.close()


def create_user(username, email, hashed_password):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO users (username, email, password) VALUES (%s, %s, %s)",
            (username, email, hashed_password),
        )
        conn.commit()
    finally:
        conn.close()


def get_all_users():
    conn = get_conn()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM users")
        return {row["username"]: {"email": row["email"], "password": row["password"], "created_at": _as_utc_iso(row["created_at"])} for row in cur.fetchall()}
    finally:
        conn.close()


def _to_native(v):
    """Convert numpy types to native Python types for psycopg2 compatibility."""
    if isinstance(v, (np.bool_,)):
        return bool(v)
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating,)):
        return float(v)
    if isinstance(v, np.ndarray):
        return v.tolist()
    return v

def save_prediction(username, data, thumbnail_b64):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO predictions
                (username, disease, disease_np, confidence, crop_type, is_unknown, not_leaf, message,
                 cause, cause_np, symptoms, symptoms_np, treatment, treatment_np, prevention, prevention_np,
                 top_5_predictions, gradcam_image, thumbnail)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            username,
            _to_native(data["disease"]),
            _to_native(data.get("disease_np", data["disease"])),
            _to_native(data["confidence"]),
            _to_native(data.get("crop_type", "")),
            _to_native(data["is_unknown"]),
            _to_native(data["not_leaf"]),
            _to_native(data["message"]),
            _to_native(data.get("cause", "")),
            _to_native(data.get("cause_np", "")),
            _to_native(data.get("symptoms", "")),
            _to_native(data.get("symptoms_np", "")),
            _to_native(data.get("treatment", "")),
            _to_native(data.get("treatment_np", "")),
            _to_native(data.get("prevention", "")),
            _to_native(data.get("prevention_np", "")),
            _to_native(json.dumps(data.get("top_5_predictions", []))),
            _to_native(data.get("gradcam_image", "")),
            _to_native(thumbnail_b64),
        ))
        conn.commit()
    finally:
        conn.close()


def _shape_row(row):
    entry = dict(row)
    entry["timestamp"] = _as_utc_iso(entry["timestamp"])
    entry["top_5_predictions"] = (
        json.loads(entry["top_5_predictions"])
        if isinstance(entry["top_5_predictions"], str)
        else entry["top_5_predictions"]
    )
    entry["id"] = str(entry["id"])
    return entry


def load_history(username, limit=50):
    """History list WITHOUT the Grad-CAM image. Each heatmap is ~380 KB of
    base64, so 50 rows would be a ~19 MB response: the phone timed out before it
    arrived. The list only needs the 5 KB thumbnail; the heatmap is fetched per
    entry by load_prediction()."""
    conn = get_conn()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            """SELECT id, username, timestamp, disease, disease_np, confidence, crop_type,
                      is_unknown, not_leaf, message, cause, cause_np, symptoms, symptoms_np,
                      treatment, treatment_np, prevention, prevention_np, top_5_predictions,
                      thumbnail
               FROM predictions WHERE username = %s ORDER BY timestamp DESC LIMIT %s""",
            (username, limit),
        )
        return [_shape_row(row) for row in cur.fetchall()]
    finally:
        conn.close()


def load_prediction(prediction_id, username):
    """One full row, heatmap included. Raises like delete_prediction does."""
    conn = get_conn()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM predictions WHERE id = %s::uuid", (prediction_id,))
        row = cur.fetchone()
        if not row:
            raise ValueError("Prediction not found")
        if row["username"] != username:
            raise PermissionError("Not authorized to read this prediction")
        return _shape_row(row)
    finally:
        conn.close()


def delete_prediction(prediction_id, username):
    conn = get_conn()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM predictions WHERE id = %s::uuid", (prediction_id,))
        row = cur.fetchone()
        if not row:
            raise ValueError("Prediction not found")
        if row["username"] != username:
            raise PermissionError("Not authorized to delete this prediction")
        cur.execute("DELETE FROM predictions WHERE id = %s::uuid", (prediction_id,))
        conn.commit()
    finally:
        conn.close()
