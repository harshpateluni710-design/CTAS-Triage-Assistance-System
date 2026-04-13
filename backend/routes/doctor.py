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

def _fetch_doctor_assessment_rows(doctor_id):
    with get_db() as conn:
        cur = get_cursor(conn)
        cur.execute(
            """
            SELECT a.id, a.patient_id, a.symptoms, a.extracted_data,
                   a.formatted_text, a.recommendation, a.tier, a.confidence, a.created_at,
                   p.full_name AS patient_name,
                   p.email AS patient_email,
                   v.id AS validation_id,
                   v.is_correct,
                   v.doctor_tier,
                   v.created_at AS validated_at,
                   v.doctor_id AS validated_by_id,
                   d.full_name AS validated_by_name,
                   d.email AS validated_by_email
            FROM assessments a
            JOIN users p ON p.id = a.patient_id
            LEFT JOIN validations v ON v.assessment_id = a.id AND v.doctor_id = %s
            LEFT JOIN users d ON d.id = v.doctor_id
            ORDER BY a.created_at DESC
            """,
            (doctor_id,),
        )
        return cur.fetchall()


def _serialize_case_row(row, validated=False):
    extracted = row["extracted_data"] if isinstance(row["extracted_data"], dict) else {}
    validation_status = "pending"
    if validated:
        validation_status = "agreed" if row.get("is_correct") else "disagreed"

    payload = {
        "id": row["id"],
        "patientId": row["patient_id"],
        "patientName": row["patient_name"],
        "patientEmail": row.get("patient_email"),
        "symptoms": row["symptoms"],
        "extractedData": extracted,
        "formattedText": row["formatted_text"],
        "recommendation": row["recommendation"],
        "tier": row["tier"],
        "confidence": row["confidence"],
        "date": str(row["created_at"]),
        "validated": bool(validated),
        "doctorAgreement": None,
        "doctorTier": None,
        "validatedAt": None,
        "status": "validated" if validated else "pending",
        "validationStatus": validation_status,
        "assessmentOwner": {
            "id": row["patient_id"],
            "fullName": row["patient_name"],
            "email": row.get("patient_email"),
        },
        "validatedBy": None,
    }

    if validated:
        payload["doctorAgreement"] = row.get("is_correct")
        payload["doctorTier"] = row.get("doctor_tier")
        payload["validatedAt"] = str(row.get("validated_at")) if row.get("validated_at") else None
        payload["validatedBy"] = {
            "id": row.get("validated_by_id"),
            "fullName": row.get("validated_by_name"),
            "email": row.get("validated_by_email"),
        }

    return payload


def _build_stats_from_cases(cases):
    total = len(cases)
    validated = [c for c in cases if c["validated"]]
    pending = total - len(validated)
    agreement_count = sum(1 for c in validated if c["doctorAgreement"])
    disagreement_count = len(validated) - agreement_count

    kappa_percent = None
    if validated:
        ai_doctor = 0
        ai_otc = 0
        doc_doctor = 0
        doc_otc = 0

        for c in validated:
            if c.get("recommendation") == "Doctor Consultation":
                ai_tier = 1
            elif c.get("recommendation") == "OTC Drug":
                ai_tier = 0
            else:
                ai_tier = int(c.get("tier") or 0)

            doctor_tier = int(c.get("doctorTier") or 0)

            if ai_tier == 1:
                ai_doctor += 1
            else:
                ai_otc += 1

            if doctor_tier == 1:
                doc_doctor += 1
            else:
                doc_otc += 1

        n = len(validated)
        po = agreement_count / n
        pe = ((ai_doctor / n) * (doc_doctor / n)) + ((ai_otc / n) * (doc_otc / n))
        if pe == 1:
            kappa_percent = 100.0
        else:
            kappa_percent = round(((po - pe) / (1 - pe)) * 100, 1)

    return {
        "totalAssessments": total,
        "validatedAssessments": len(validated),
        "pendingAssessments": pending,
        "agreementCount": agreement_count,
        "disagreementCount": disagreement_count,
        "kappaPercent": kappa_percent,
    }


@doctor_bp.route("/assessments", methods=["GET"])
@require_auth(allowed_roles=["doctor"])
def get_assessments_with_counts():
    """Return all assessments with this doctor's validation status + counts."""
    rows = _fetch_doctor_assessment_rows(g.user_id)
    cases = [_serialize_case_row(r, validated=bool(r.get("validation_id"))) for r in rows]
    counts = _build_stats_from_cases(cases)
    return jsonify({
        "count": len(cases),
        "counts": counts,
        "items": cases,
    })


@doctor_bp.route("/assessments/validated", methods=["GET"])
@require_auth(allowed_roles=["doctor"])
def get_assessments_validated_with_status():
    """Return only assessments validated by this doctor (agree + disagree)."""
    rows = _fetch_doctor_assessment_rows(g.user_id)
    cases = [_serialize_case_row(r, validated=bool(r.get("validation_id"))) for r in rows]
    validated_cases = [c for c in cases if c["validated"]]
    return jsonify({
        "count": len(validated_cases),
        "items": validated_cases,
    })

@doctor_bp.route("/cases", methods=["GET"])
@require_auth(allowed_roles=["doctor"])
def get_cases():
    """Return doctor cases; supports scope=pending|validated|all."""
    scope = (request.args.get("scope") or "pending").strip().lower()
    rows = _fetch_doctor_assessment_rows(g.user_id)
    cases = [_serialize_case_row(r, validated=bool(r.get("validation_id"))) for r in rows]

    if scope == "validated":
        return jsonify([c for c in cases if c["validated"]])
    if scope == "all":
        return jsonify(cases)
    return jsonify([c for c in cases if not c["validated"]])


@doctor_bp.route("/validated-cases", methods=["GET"])
@require_auth(allowed_roles=["doctor"])
def get_validated_cases():
    """Return assessments already validated by this doctor (agree + disagree)."""
    rows = _fetch_doctor_assessment_rows(g.user_id)
    cases = [_serialize_case_row(r, validated=bool(r.get("validation_id"))) for r in rows]
    return jsonify([c for c in cases if c["validated"]])


@doctor_bp.route("/stats", methods=["GET"])
@require_auth(allowed_roles=["doctor"])
def get_stats():
    """Return lifetime validation stats for the logged-in doctor."""
    rows = _fetch_doctor_assessment_rows(g.user_id)
    cases = [_serialize_case_row(r, validated=bool(r.get("validation_id"))) for r in rows]
    return jsonify(_build_stats_from_cases(cases))


# ---------- Submit Validation ----------

@doctor_bp.route("/validate", methods=["POST"])
@require_auth(allowed_roles=["doctor"])
def submit_validation():
    data = request.get_json(silent=True) or {}
    assessment_id = data.get("assessmentId")
    is_correct_raw = data.get("isCorrect", True)
    doctor_tier = data.get("doctorTier", 0)

    # Accept scalar ids; if client accidentally sends a list, pick the first item.
    if isinstance(assessment_id, list):
        assessment_id = assessment_id[0] if assessment_id else None

    try:
        assessment_id = int(assessment_id)
    except (TypeError, ValueError):
        return jsonify({"error": "assessmentId must be a valid integer"}), 400

    try:
        doctor_tier = int(doctor_tier)
    except (TypeError, ValueError):
        doctor_tier = 0

    if isinstance(is_correct_raw, bool):
        is_correct = is_correct_raw
    elif isinstance(is_correct_raw, str):
        is_correct = is_correct_raw.strip().lower() in ("true", "1", "yes", "agree")
    else:
        is_correct = bool(is_correct_raw)

    if not assessment_id:
        return jsonify({"error": "assessmentId is required"}), 400

    validation_status = "agreed" if is_correct else "disagreed"

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

        # If the denormalized status columns exist on assessments, maintain them too.
        cur.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'assessments'
              AND column_name IN ('validation_status', 'validated_by', 'validated_at')
            """
        )
        cols = {r["column_name"] for r in cur.fetchall()}
        if {"validation_status", "validated_by", "validated_at"}.issubset(cols):
            cur.execute(
                """
                UPDATE assessments
                SET validation_status = %s,
                    validated_by = %s,
                    validated_at = now()
                WHERE id = %s
                """,
                (validation_status, g.user_id, assessment_id),
            )

    return jsonify({
        "message": "Validation submitted",
        "assessmentId": assessment_id,
        "validationStatus": validation_status,
        "validatedBy": g.user_id,
    })


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
