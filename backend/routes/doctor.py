"""
Doctor routes – patient cases for validation, submit validation, protocols.
"""

import json
from flask import Blueprint, request, jsonify, g
from database import get_db, get_cursor
from routes.auth import require_auth

doctor_bp = Blueprint("doctor", __name__, url_prefix="/api/doctor")


# ---------- Profile ----------

@doctor_bp.route("/profile", methods=["GET"])
@require_auth(allowed_roles=["doctor"])
def get_profile():
    with get_db() as conn:
        cur = get_cursor(conn)
        cur.execute(
            """SELECT id, email, full_name, phone, date_of_birth,
                      license_number, specialty, hospital, created_at
               FROM users WHERE id=%s""",
            (g.user_id,),
        )
        user = cur.fetchone()
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({
        "id": user["id"],
        "email": user["email"],
        "fullName": user["full_name"],
        "phone": user["phone"],
        "dateOfBirth": user["date_of_birth"],
        "licenseNumber": user["license_number"],
        "specialty": user["specialty"],
        "hospital": user["hospital"],
        "createdAt": str(user["created_at"]),
    })


@doctor_bp.route("/profile", methods=["PUT"])
@require_auth(allowed_roles=["doctor"])
def update_profile():
    data = request.get_json(silent=True) or {}
    allowed = {
        "fullName": "full_name",
        "phone": "phone",
        "dateOfBirth": "date_of_birth",
        "licenseNumber": "license_number",
        "specialty": "specialty",
        "hospital": "hospital",
    }
    sets, vals = [], []
    for key, col in allowed.items():
        if key in data:
            sets.append(f"{col}=%s")
            vals.append(data[key])
    if not sets:
        return jsonify({"error": "Nothing to update"}), 400
    vals.append(g.user_id)
    with get_db() as conn:
        cur = get_cursor(conn)
        cur.execute(f"UPDATE users SET {', '.join(sets)} WHERE id=%s", vals)
    return jsonify({"message": "Profile updated"})


@doctor_bp.route("/password", methods=["PUT"])
@require_auth(allowed_roles=["doctor"])
def change_password():
    from werkzeug.security import generate_password_hash, check_password_hash
    data = request.get_json(silent=True) or {}
    current = data.get("currentPassword", "")
    new_pw = data.get("newPassword", "")
    if not current or not new_pw:
        return jsonify({"error": "Both current and new password required"}), 400
    with get_db() as conn:
        cur = get_cursor(conn)
        cur.execute("SELECT password FROM users WHERE id=%s", (g.user_id,))
        user = cur.fetchone()
        if not user or not check_password_hash(user["password"], current):
            return jsonify({"error": "Current password is incorrect"}), 401
        cur.execute("UPDATE users SET password=%s WHERE id=%s", (generate_password_hash(new_pw), g.user_id))
    return jsonify({"message": "Password changed"})


# ---------- Patient Cases ----------

@doctor_bp.route("/cases", methods=["GET"])
@require_auth(allowed_roles=["doctor"])
def get_cases():
    """Return assessments with this doctor's validation state, if available."""
    with get_db() as conn:
        cur = get_cursor(conn)
        cur.execute("""
            SELECT a.id, a.patient_id, a.symptoms, a.extracted_data,
                   a.formatted_text, a.recommendation, a.tier, a.confidence, a.created_at,
                   u.full_name AS patient_name,
                   v.id AS validation_id,
                   v.is_correct,
                   v.doctor_tier,
                   v.created_at AS validated_at
            FROM assessments a
            JOIN users u ON u.id = a.patient_id
            LEFT JOIN validations v ON v.assessment_id = a.id AND v.doctor_id = %s
            ORDER BY (v.id IS NULL) DESC, a.created_at DESC
        """, (g.user_id,))
        rows = cur.fetchall()

    cases = []
    for r in rows:
        extracted = r["extracted_data"] if isinstance(r["extracted_data"], dict) else {}

        cases.append({
            "id": r["id"],
            "patientId": r["patient_id"],
            "patientName": r["patient_name"],
            "symptoms": r["symptoms"],
            "extractedData": extracted,
            "formattedText": r["formatted_text"],
            "recommendation": r["recommendation"],
            "tier": r["tier"],
            "confidence": r["confidence"],
            "date": str(r["created_at"]),
            "validated": bool(r["validation_id"]),
            "doctorAgreement": r["is_correct"],
            "doctorTier": r["doctor_tier"],
            "validatedAt": str(r["validated_at"]) if r["validated_at"] else None,
            "status": "validated" if r["validation_id"] else "pending",
        })
    return jsonify(cases)


# ---------- Submit Validation ----------

@doctor_bp.route("/validate", methods=["POST"])
@require_auth(allowed_roles=["doctor"])
def submit_validation():
    data = request.get_json(silent=True) or {}
    assessment_id = data.get("assessmentId")
    is_correct = data.get("isCorrect", True)
    doctor_tier = data.get("doctorTier", 0)

    if not assessment_id:
        return jsonify({"error": "assessmentId is required"}), 400

    with get_db() as conn:
        cur = get_cursor(conn)
        # Check assessment exists
        cur.execute("SELECT id FROM assessments WHERE id=%s", (assessment_id,))
        if not cur.fetchone():
            return jsonify({"error": "Assessment not found"}), 404

        cur.execute(
            """INSERT INTO validations (assessment_id, doctor_id, is_correct, doctor_tier)
               VALUES (%s, %s, %s, %s)
               ON CONFLICT (assessment_id, doctor_id)
               DO UPDATE SET is_correct = EXCLUDED.is_correct, doctor_tier = EXCLUDED.doctor_tier""",
            (assessment_id, g.user_id, is_correct, doctor_tier),
        )

    return jsonify({"message": "Validation submitted"})


# ---------- Protocols ----------

@doctor_bp.route("/protocols", methods=["GET"])
@require_auth(allowed_roles=["doctor"])
def get_protocols():
    with get_db() as conn:
        cur = get_cursor(conn)
        cur.execute("SELECT * FROM protocols WHERE active=true ORDER BY updated_at DESC")
        rows = cur.fetchall()

    protocols = []
    for r in rows:
        criteria = r["criteria"] if isinstance(r["criteria"], list) else []
        protocols.append({
            "id": r["id"],
            "title": r["title"],
            "type": r["type"],
            "description": r["description"],
            "criteria": criteria,
            "lastUpdated": str(r["updated_at"]),
        })
    return jsonify(protocols)
