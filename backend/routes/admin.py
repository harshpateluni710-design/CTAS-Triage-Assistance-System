"""
Admin routes – system metrics, bias audit, knowledge base management.
"""

import json
from flask import Blueprint, request, jsonify, g
from database import get_db, get_cursor
from routes.auth import require_auth

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


# ---------- Profile ----------

@admin_bp.route("/profile", methods=["GET"])
@require_auth(allowed_roles=["admin"])
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


@admin_bp.route("/profile", methods=["PUT"])
@require_auth(allowed_roles=["admin"])
def update_profile():
    data = request.get_json(silent=True) or {}
    allowed = {"fullName": "full_name", "phone": "phone", "dateOfBirth": "date_of_birth"}
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


@admin_bp.route("/password", methods=["PUT"])
@require_auth(allowed_roles=["admin"])
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


# ---------- System Metrics ----------

@admin_bp.route("/metrics", methods=["GET"])
@require_auth(allowed_roles=["admin"])
def get_metrics():
    with get_db() as conn:
        cur = get_cursor(conn)
        cur.execute("SELECT COUNT(*) AS c FROM assessments")
        total_assessments = cur.fetchone()["c"]
        cur.execute("SELECT COUNT(*) AS c FROM users WHERE role='patient'")
        total_patients = cur.fetchone()["c"]
        cur.execute("SELECT COUNT(*) AS c FROM users WHERE role='doctor'")
        total_doctors = cur.fetchone()["c"]
        cur.execute("SELECT COUNT(*) AS c FROM validations")
        total_validations = cur.fetchone()["c"]

        # Tier distribution
        cur.execute("SELECT tier, COUNT(*) AS c FROM assessments GROUP BY tier ORDER BY tier")
        tiers = cur.fetchall()

        # Accuracy (validated as correct / total validated)
        cur.execute("SELECT COUNT(*) AS c FROM validations WHERE is_correct=true")
        correct = cur.fetchone()["c"]
        accuracy = (correct / total_validations * 100) if total_validations > 0 else 0

        # Recent 7-day trend
        cur.execute("""
            SELECT DATE(created_at) AS day, COUNT(*) AS c
            FROM assessments
            WHERE created_at >= now() - interval '7 days'
            GROUP BY day ORDER BY day
        """)
        daily = cur.fetchall()

    return jsonify({
        "totalAssessments": total_assessments,
        "totalPatients": total_patients,
        "totalDoctors": total_doctors,
        "totalValidations": total_validations,
        "accuracy": round(accuracy, 1),
        "tierDistribution": [{"name": f"Tier {r['tier']}", "value": r["c"]} for r in tiers],
        "dailyTrend": [{"date": str(r["day"]), "assessments": r["c"]} for r in daily],
    })


# ---------- Bias Audit ----------

@admin_bp.route("/bias-audit", methods=["GET"])
@require_auth(allowed_roles=["admin"])
def get_bias_audit():
    """Analyze assessment distribution for potential bias indicators."""
    with get_db() as conn:
        cur = get_cursor(conn)
        # Overall tier distribution
        cur.execute("SELECT tier, COUNT(*) AS c FROM assessments GROUP BY tier")
        tiers = cur.fetchall()

        # Accuracy per tier
        cur.execute("""
            SELECT a.tier,
                   COUNT(v.id) AS validated,
                   SUM(CASE WHEN v.is_correct THEN 1 ELSE 0 END) AS correct
            FROM assessments a
            JOIN validations v ON v.assessment_id = a.id
            GROUP BY a.tier ORDER BY a.tier
        """)
        per_tier = cur.fetchall()

        # Confidence distribution
        cur.execute("""
            SELECT
                CASE
                    WHEN confidence >= 0.9 THEN 'High (≥90%)'
                    WHEN confidence >= 0.7 THEN 'Medium (70-89%)'
                    ELSE 'Low (<70%)'
                END AS bucket,
                COUNT(*) AS c
            FROM assessments
            GROUP BY bucket
        """)
        confidence = cur.fetchall()

    tier_accuracy = []
    for r in per_tier:
        acc = (r["correct"] / r["validated"] * 100) if r["validated"] > 0 else 0
        tier_accuracy.append({"tier": r["tier"], "accuracy": round(acc, 1), "validated": r["validated"]})

    return jsonify({
        "tierDistribution": [{"name": f"Tier {r['tier']}", "value": r["c"]} for r in tiers],
        "tierAccuracy": tier_accuracy,
        "confidenceDistribution": [{"name": r["bucket"], "value": r["c"]} for r in confidence],
    })


# ---------- Knowledge Base ----------

@admin_bp.route("/knowledge-base", methods=["GET"])
@require_auth(allowed_roles=["admin"])
def get_knowledge_base():
    with get_db() as conn:
        cur = get_cursor(conn)
        cur.execute("SELECT * FROM protocols ORDER BY updated_at DESC")
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
            "active": bool(r["active"]),
            "lastUpdated": str(r["updated_at"]),
        })
    return jsonify(protocols)


@admin_bp.route("/upload-protocol", methods=["POST"])
@require_auth(allowed_roles=["admin"])
def upload_protocol():
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    ptype = (data.get("type") or "").strip()
    description = (data.get("description") or "").strip()
    criteria = json.dumps(data.get("criteria", []))

    if not title:
        return jsonify({"error": "Title is required"}), 400

    with get_db() as conn:
        cur = get_cursor(conn)
        cur.execute(
            """INSERT INTO protocols (title, type, description, criteria)
               VALUES (%s, %s, %s, %s) RETURNING id""",
            (title, ptype, description, criteria),
        )
        new_id = cur.fetchone()["id"]
    return jsonify({"id": new_id, "message": "Protocol uploaded"}), 201


@admin_bp.route("/protocol/<int:protocol_id>", methods=["DELETE"])
@require_auth(allowed_roles=["admin"])
def delete_protocol(protocol_id):
    with get_db() as conn:
        cur = get_cursor(conn)
        cur.execute("SELECT id FROM protocols WHERE id=%s", (protocol_id,))
        if not cur.fetchone():
            return jsonify({"error": "Protocol not found"}), 404
        cur.execute("DELETE FROM protocols WHERE id=%s", (protocol_id,))
    return jsonify({"message": "Protocol deleted"})
