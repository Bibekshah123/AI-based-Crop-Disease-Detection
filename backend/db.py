import os
import json
import numpy as np
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "crop_disease")
DB_USER = os.getenv("DB_USER", "app")
DB_PASSWORD = os.getenv("DB_PASSWORD", "app_password")


def get_conn():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
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
        return {row["username"]: {"email": row["email"], "password": row["password"], "created_at": row["created_at"].isoformat() if row["created_at"] else ""} for row in cur.fetchall()}
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


def load_history(username, limit=50):
    conn = get_conn()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            "SELECT * FROM predictions WHERE username = %s ORDER BY timestamp DESC LIMIT %s",
            (username, limit),
        )
        rows = cur.fetchall()
        result = []
        for row in rows:
            entry = dict(row)
            entry["timestamp"] = entry["timestamp"].isoformat()
            entry["top_5_predictions"] = json.loads(entry["top_5_predictions"]) if isinstance(entry["top_5_predictions"], str) else entry["top_5_predictions"]
            entry["id"] = str(entry["id"])
            result.append(entry)
        return result
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
