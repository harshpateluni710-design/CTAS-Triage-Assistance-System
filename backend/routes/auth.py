"""
Auth routes – register & login for patient / doctor / admin.
Issues JWT access tokens stored on the client.
"""

import os, json, datetime
from flask import Blueprint, request, jsonify
import jwt
from werkzeug.security import generate_password_hash, check_password_hash
from database import get_db, get_cursor

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

SECRET_KEY = os.environ.get("JWT_SECRET", "ctas-secret-key-change-in-prod")
TOKEN_EXPIRY_HOURS = 24


def _make_token(user_id: int, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=TOKEN_EXPIRY_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


def _row_to_dict(row):
    return dict(row) if row else None


# ---------- Patient auth ----------

@auth_bp.route("/patient/register", methods=["POST"])
def patient_register():
    data = request.get_json(silent=True) or {}
    full_name = (data.get("fullName") or "").strip()
    email = (data.get("email") or "").strip().lower()
    phone = (data.get("phone") or "").strip()
    dob = (data.get("dateOfBirth") or "").strip()
    password = data.get("password") or ""

    if not email or not password or not full_name:
        return jsonify({"error": "Full name, email and password are required"}), 400

    with get_db() as conn:
        cur = get_cursor(conn)
        cur.execute("SELECT id FROM users WHERE email=%s", (email,))
        if cur.fetchone():
            return jsonify({"error": "Email already registered"}), 409
        cur.execute(
            "INSERT INTO users (email, password, role, full_name, phone, date_of_birth) VALUES (%s,%s,%s,%s,%s,%s) RETURNING id",
            (email, generate_password_hash(password), "patient", full_name, phone, dob),
        )
        user_id = cur.fetchone()["id"]

    token = _make_token(user_id, "patient")
    return jsonify({"token": token, "user": {"id": user_id, "email": email, "fullName": full_name, "role": "patient"}}), 201


@auth_bp.route("/patient/login", methods=["POST"])
def patient_login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    with get_db() as conn:
        cur = get_cursor(conn)
        cur.execute("SELECT * FROM users WHERE email=%s AND role='patient'", (email,))
        user = cur.fetchone()
    if not user or not check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid credentials"}), 401

    token = _make_token(user["id"], "patient")
    return jsonify({
        "token": token,
        "user": {"id": user["id"], "email": user["email"], "fullName": user["full_name"], "role": "patient"},
    })


# ---------- Doctor auth ----------

@auth_bp.route("/doctor/register", methods=["POST"])
def doctor_register():
    data = request.get_json(silent=True) or {}
    full_name = (data.get("fullName") or "").strip()
    email = (data.get("email") or "").strip().lower()
    phone = (data.get("phone") or "").strip()
    license_number = (data.get("licenseNumber") or "").strip()
    specialty = (data.get("specialty") or "").strip()
    hospital = (data.get("hospital") or "").strip()
    password = data.get("password") or ""

    if not email or not password or not full_name:
        return jsonify({"error": "Full name, email and password are required"}), 400

    with get_db() as conn:
        cur = get_cursor(conn)
        cur.execute("SELECT id FROM users WHERE email=%s", (email,))
        if cur.fetchone():
            return jsonify({"error": "Email already registered"}), 409
        cur.execute(
            """INSERT INTO users (email, password, role, full_name, phone, license_number, specialty, hospital)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
            (email, generate_password_hash(password), "doctor", full_name, phone, license_number, specialty, hospital),
        )
        user_id = cur.fetchone()["id"]

    token = _make_token(user_id, "doctor")
    return jsonify({"token": token, "user": {"id": user_id, "email": email, "fullName": full_name, "role": "doctor"}}), 201


@auth_bp.route("/doctor/login", methods=["POST"])
def doctor_login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    with get_db() as conn:
        cur = get_cursor(conn)
        cur.execute("SELECT * FROM users WHERE email=%s AND role='doctor'", (email,))
        user = cur.fetchone()
    if not user or not check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid credentials"}), 401

    token = _make_token(user["id"], "doctor")
    return jsonify({
        "token": token,
        "user": {"id": user["id"], "email": user["email"], "fullName": user["full_name"], "role": "doctor"},
    })


# ---------- Admin auth ----------

@auth_bp.route("/admin/register", methods=["POST"])
def admin_register():
    data = request.get_json(silent=True) or {}
    full_name = (data.get("fullName") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password or not full_name:
        return jsonify({"error": "Full name, email and password are required"}), 400

    with get_db() as conn:
        cur = get_cursor(conn)
        cur.execute("SELECT id FROM users WHERE email=%s", (email,))
        if cur.fetchone():
            return jsonify({"error": "Email already registered"}), 409
        cur.execute(
            "INSERT INTO users (email, password, role, full_name) VALUES (%s,%s,%s,%s) RETURNING id",
            (email, generate_password_hash(password), "admin", full_name),
        )
        user_id = cur.fetchone()["id"]

    token = _make_token(user_id, "admin")
    return jsonify({"token": token, "user": {"id": user_id, "email": email, "fullName": full_name, "role": "admin"}}), 201


@auth_bp.route("/admin/login", methods=["POST"])
def admin_login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    with get_db() as conn:
        cur = get_cursor(conn)
        cur.execute("SELECT * FROM users WHERE email=%s AND role='admin'", (email,))
        user = cur.fetchone()
    if not user or not check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid credentials"}), 401

    token = _make_token(user["id"], "admin")
    return jsonify({
        "token": token,
        "user": {"id": user["id"], "email": user["email"], "fullName": user["full_name"], "role": "admin"},
    })


# ---------- Token verification helper (used by other blueprints) ----------

def require_auth(allowed_roles=None):
    """Decorator factory that verifies JWT and injects `g.user_id` / `g.role`."""
    from functools import wraps
    from flask import g

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            header = request.headers.get("Authorization", "")
            if not header.startswith("Bearer "):
                return jsonify({"error": "Missing or invalid token"}), 401
            token = header.split(" ", 1)[1]
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            except jwt.ExpiredSignatureError:
                return jsonify({"error": "Token expired"}), 401
            except jwt.InvalidTokenError:
                return jsonify({"error": "Invalid token"}), 401

            if allowed_roles and payload.get("role") not in allowed_roles:
                return jsonify({"error": "Forbidden"}), 403

            g.user_id = payload["user_id"]
            g.role = payload["role"]
            return fn(*args, **kwargs)
        return wrapper
    return decorator
