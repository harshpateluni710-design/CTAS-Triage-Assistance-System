"""
Patient routes – profile CRUD, assessment history, analytics.
"""

import json
from flask import Blueprint, request, jsonify, g
from database import get_db, get_cursor
from routes.auth import require_auth

patient_bp = Blueprint("patient", __name__, url_prefix="/api/patient")


# ---------- Profile ----------

@patient_bp.route("/profile", methods=["GET"])
@require_auth(allowed_roles=["patient"])
def get_profile():
    with get_db() as conn:
        cur = get_cursor(conn)
        cur.execute(
            "SELECT id, email, full_name, phone, date_of_birth, created_at FROM users WHERE id=%s",
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
        "createdAt": str(user["created_at"]),
    })


@patient_bp.route("/profile", methods=["PUT"])
@require_auth(allowed_roles=["patient"])
def update_profile():
    data = request.get_json(silent=True) or {}
    full_name = data.get("fullName")
    phone = data.get("phone")
    dob = data.get("dateOfBirth")

    sets, vals = [], []
    if full_name is not None:
        sets.append("full_name=%s"); vals.append(full_name)
    if phone is not None:
        sets.append("phone=%s"); vals.append(phone)
    if dob is not None:
        sets.append("date_of_birth=%s"); vals.append(dob)

    if not sets:
        return jsonify({"error": "Nothing to update"}), 400

    vals.append(g.user_id)
    with get_db() as conn:
        cur = get_cursor(conn)
        cur.execute(f"UPDATE users SET {', '.join(sets)} WHERE id=%s", vals)

    return jsonify({"message": "Profile updated"})


@patient_bp.route("/password", methods=["PUT"])
@require_auth(allowed_roles=["patient"])
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


@patient_bp.route("/account", methods=["DELETE"])
@require_auth(allowed_roles=["patient"])
def delete_account():
    with get_db() as conn:
        cur = get_cursor(conn)
        cur.execute("DELETE FROM users WHERE id=%s", (g.user_id,))
    return jsonify({"message": "Account deleted"})


# ---------- Assessment History ----------

@patient_bp.route("/history", methods=["GET"])
@require_auth(allowed_roles=["patient"])
def get_history():
    with get_db() as conn:
        cur = get_cursor(conn)
        cur.execute(
            "SELECT * FROM assessments WHERE patient_id=%s ORDER BY created_at DESC",
            (g.user_id,),
        )
        rows = cur.fetchall()

    history = []
    for r in rows:
        extracted = r["extracted_data"] if isinstance(r["extracted_data"], dict) else {}

        history.append({
            "id": r["id"],
            "date": str(r["created_at"]),
            "symptoms": r["symptoms"],
            "extractedData": extracted,
            "formattedText": r["formatted_text"],
            "recommendation": r["recommendation"],
            "tier": r["tier"],
            "confidence": r["confidence"],
        })
    return jsonify(history)


@patient_bp.route("/history", methods=["POST"])
@require_auth(allowed_roles=["patient"])
def save_assessment():
    data = request.get_json(silent=True) or {}
    symptoms = data.get("symptoms", "")
    extracted_data = json.dumps(data.get("extractedData", {}))
    formatted_text = data.get("formattedText", "")
    recommendation = data.get("recommendation", "")
    tier = data.get("tier")
    if tier is None:
        rec = str(recommendation).strip().lower()
        tier = 1 if rec == "doctor consultation" else 0
    confidence = data.get("confidence", 0)

    with get_db() as conn:
        cur = get_cursor(conn)
        cur.execute(
            """INSERT INTO assessments (patient_id, symptoms, extracted_data, formatted_text, recommendation, tier, confidence)
               VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
            (g.user_id, symptoms, extracted_data, formatted_text, recommendation, tier, confidence),
        )
        new_id = cur.fetchone()["id"]
    return jsonify({"id": new_id, "message": "Assessment saved"}), 201


# ---------- Analytics ----------

@patient_bp.route("/analytics", methods=["GET"])
@require_auth(allowed_roles=["patient"])
def get_analytics():
    with get_db() as conn:
        cur = get_cursor(conn)
        cur.execute(
            "SELECT * FROM assessments WHERE patient_id=%s ORDER BY created_at ASC",
            (g.user_id,),
        )
        rows = cur.fetchall()

    total = len(rows)
    tier_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    monthly = {}
    symptom_freq = {}

    for r in rows:
        t = r["tier"]
        if t in tier_counts:
            tier_counts[t] += 1

        month = str(r["created_at"])[:7] if r["created_at"] else "unknown"
        monthly[month] = monthly.get(month, 0) + 1

        try:
            extracted = r["extracted_data"] if isinstance(r["extracted_data"], dict) else json.loads(r["extracted_data"])
            for ent in extracted.get("entities", []):
                label = ent.get("entity", "")
                if label:
                    symptom_freq[label] = symptom_freq.get(label, 0) + 1
        except (json.JSONDecodeError, TypeError):
            pass

    return jsonify({
        "totalAssessments": total,
        "tierDistribution": [
            {"name": f"Tier {k}", "value": v} for k, v in tier_counts.items()
        ],
        "monthlyTrend": [
            {"month": m, "assessments": c} for m, c in monthly.items()
        ],
        "topSymptoms": sorted(
            [{"name": k, "count": v} for k, v in symptom_freq.items()],
            key=lambda x: x["count"],
            reverse=True,
        )[:10],
    })
