"""
Admin routes – system metrics, bias audit, knowledge base management.
"""

import io
import importlib
import json
import re
from pathlib import Path
from flask import Blueprint, request, jsonify, g
from database import get_db, get_cursor
from routes.auth import require_auth

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


def _clean_text(value):
    return str(value or "").strip()


def _normalize_criteria(raw_value):
    if raw_value is None:
        return []

    if isinstance(raw_value, list):
        return [str(item).strip() for item in raw_value if str(item).strip()]

    if isinstance(raw_value, str):
        text = raw_value.strip()
        if not text:
            return []
        try:
            parsed = json.loads(text)
            if isinstance(parsed, list):
                return [str(item).strip() for item in parsed if str(item).strip()]
        except json.JSONDecodeError:
            pass
        return [line.strip(" -*") for line in text.splitlines() if line.strip()]

    return []


def _derive_criteria_from_text(text, max_items=25):
    line_items = []
    for line in re.split(r"[\r\n]+", text):
        cleaned = line.strip(" -*\t")
        if len(cleaned) >= 4:
            line_items.append(cleaned)

    if len(line_items) < 3:
        line_items = [
            sentence.strip(" -*\t")
            for sentence in re.split(r"(?<=[.!?])\s+", text)
            if len(sentence.strip()) >= 12
        ]

    deduped = []
    seen = set()
    for item in line_items:
        normalized = item.lower()
        if normalized in seen:
            continue
        seen.add(normalized)
        deduped.append(item)
        if len(deduped) >= max_items:
            break

    return deduped


def _extract_pdf_text(file_bytes):
    try:
        pypdf = importlib.import_module("pypdf")
        reader_class = getattr(pypdf, "PdfReader")
    except Exception:
        return None, "PDF parser is not installed on the server"

    try:
        reader = reader_class(io.BytesIO(file_bytes))
    except Exception:
        return None, "Uploaded PDF could not be read"

    chunks = []
    for page in reader.pages:
        try:
            page_text = (page.extract_text() or "").strip()
        except Exception:
            page_text = ""

        if page_text:
            chunks.append(page_text)

    text = "\n".join(chunks).strip()
    if not text:
        return None, "No extractable text found in PDF. If it is a scanned image PDF, OCR support is required."

    return text, None


def _serialize_protocol(row):
    criteria = row["criteria"] if isinstance(row["criteria"], list) else []
    return {
        "id": row["id"],
        "title": row["title"],
        "type": row["type"],
        "description": row["description"],
        "criteria": criteria,
        "active": bool(row["active"]),
        "lastUpdated": str(row["updated_at"]),
    }


def _extract_protocol_payload():
    title = ""
    ptype = ""
    description = ""
    criteria = []

    is_multipart = (request.content_type or "").lower().startswith("multipart/form-data")
    if is_multipart:
        title = _clean_text(request.form.get("title"))
        ptype = _clean_text(request.form.get("type"))
        description = _clean_text(request.form.get("description"))
        criteria = _normalize_criteria(request.form.get("criteria"))

        uploaded_file = request.files.get("file")
        if uploaded_file and uploaded_file.filename:
            filename = Path(uploaded_file.filename).name
            suffix = Path(filename).suffix.lower()
            file_bytes = uploaded_file.read()

            if not title:
                title = Path(filename).stem

            if suffix == ".json":
                try:
                    parsed = json.loads(file_bytes.decode("utf-8", errors="ignore") or "{}")
                except json.JSONDecodeError:
                    return None, "Uploaded JSON file is invalid"

                if isinstance(parsed, dict):
                    title = title or _clean_text(parsed.get("title"))
                    ptype = ptype or _clean_text(parsed.get("type"))
                    description = description or _clean_text(parsed.get("description"))
                    if not criteria:
                        criteria = _normalize_criteria(parsed.get("criteria"))
                elif isinstance(parsed, list) and not criteria:
                    criteria = _normalize_criteria(parsed)
            elif suffix in {".txt", ".md", ".csv"}:
                text = file_bytes.decode("utf-8", errors="ignore")
                if not description:
                    description = text[:5000].strip()
                if not criteria:
                    criteria = _derive_criteria_from_text(text)
            elif suffix == ".pdf":
                text, pdf_error = _extract_pdf_text(file_bytes)
                if pdf_error:
                    return None, pdf_error
                if not description:
                    description = text[:5000].strip()
                if not criteria:
                    criteria = _derive_criteria_from_text(text)
            else:
                return None, "Unsupported file type. Use .json, .txt, .md, .csv, or .pdf"
    else:
        data = request.get_json(silent=True) or {}
        title = _clean_text(data.get("title"))
        ptype = _clean_text(data.get("type"))
        description = _clean_text(data.get("description"))
        criteria = _normalize_criteria(data.get("criteria"))

    if not title:
        return None, "Title is required"

    return {
        "title": title,
        "type": ptype,
        "description": description,
        "criteria": criteria,
    }, None


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
    query = _clean_text(request.args.get("q"))
    active_raw = _clean_text(request.args.get("active")).lower()
    where = []
    params = []

    if query:
        like_query = f"%{query}%"
        where.append("(title ILIKE %s OR type ILIKE %s OR description ILIKE %s)")
        params.extend([like_query, like_query, like_query])

    if active_raw in {"true", "false"}:
        where.append("active = %s")
        params.append(active_raw == "true")

    sql = "SELECT * FROM protocols"
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY updated_at DESC"

    with get_db() as conn:
        cur = get_cursor(conn)
        cur.execute(sql, params)
        rows = cur.fetchall()

    return jsonify([_serialize_protocol(r) for r in rows])


@admin_bp.route("/protocol/<int:protocol_id>", methods=["GET"])
@require_auth(allowed_roles=["admin"])
def get_protocol_by_id(protocol_id):
    with get_db() as conn:
        cur = get_cursor(conn)
        cur.execute("SELECT * FROM protocols WHERE id=%s", (protocol_id,))
        row = cur.fetchone()

    if not row:
        return jsonify({"error": "Protocol not found"}), 404
    return jsonify(_serialize_protocol(row))


@admin_bp.route("/upload-protocol", methods=["POST"])
@require_auth(allowed_roles=["admin"])
def upload_protocol():
    payload, error = _extract_protocol_payload()
    if error:
        return jsonify({"error": error}), 400

    with get_db() as conn:
        cur = get_cursor(conn)
        cur.execute(
            """INSERT INTO protocols (title, type, description, criteria)
               VALUES (%s, %s, %s, %s)
               ON CONFLICT (title)
               DO UPDATE SET
                   type = EXCLUDED.type,
                   description = EXCLUDED.description,
                   criteria = EXCLUDED.criteria,
                   active = true
               RETURNING id""",
            (
                payload["title"],
                payload["type"],
                payload["description"],
                json.dumps(payload["criteria"]),
            ),
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
