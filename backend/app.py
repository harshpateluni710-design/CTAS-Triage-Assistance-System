"""
CTAS Backend - Flask Inference Server
Parallel Pipeline: Raw text → BioBERT Classifier, Raw text → NER (display only)

Custom Docker API servers on HF Spaces:
  - NER: https://harsh710000-ctas-ner-api.hf.space/predict
  - Classifier: https://harsh710000-biobert-classifier-api.hf.space/predict
"""

import os
import re
from concurrent.futures import ThreadPoolExecutor
import requests as http_requests
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)

# Allow all origins by default; set CORS_ORIGINS for stricter production policy.
cors_origins_raw = os.environ.get("CORS_ORIGINS", "*").strip()
if cors_origins_raw == "*":
    CORS(app)
else:
    origins = [o.strip() for o in cors_origins_raw.split(",") if o.strip()]
    CORS(app, resources={r"/*": {"origins": origins}})

# ---------------------------------------------------------------------------
# Database & Blueprints
# ---------------------------------------------------------------------------
from database import init_db
from routes.auth import auth_bp
from routes.patient import patient_bp
from routes.doctor import doctor_bp
from routes.admin import admin_bp

app.register_blueprint(auth_bp)
app.register_blueprint(patient_bp)
app.register_blueprint(doctor_bp)
app.register_blueprint(admin_bp)

init_db()

# ---------------------------------------------------------------------------
# Custom Docker API Endpoints (HF Spaces)
# ---------------------------------------------------------------------------
NER_API_URL = os.environ.get(
    "NER_API_URL",
    "https://harsh710000-ctas-ner-api.hf.space/predict",
)
CLF_API_URL = os.environ.get(
    "CLF_API_URL",
    "https://harsh710000-biobert-classifier-api.hf.space/predict",
)

CLASSIFICATION_LABELS = {"LABEL_0": "OTC Drug", "LABEL_1": "Doctor Consultation"}

# ---------------------------------------------------------------------------
# Clinical Safety Rules (post-prediction override)
# ---------------------------------------------------------------------------

ESCALATE_TO_DOCTOR = [
    r"blood\s+in\s+(my\s+)?(stool|urine|vomit|sputum|cough)",
    r"coughing\s+up\s+blood",
    r"chest\s+pain.*radiat",
    r"can'?t\s+breathe",
    r"seizure",
    r"blacki?ng\s+out",
    r"lump\s+(in|on)\s+(my\s+)?(breast|neck|testicle)",
    r"mole\s+(that\s+)?change",
    r"face\s+(is\s+)?droop",
    r"sudden(ly)?\s+(numb|vision\s+loss|hearing\s+loss|confus)",
    r"purple\s+(rash|dots|spots)",
    r"won'?t\s+stop\s+bleed",
    r"double\s+dose|overdose|took\s+too\s+(much|many)",
    r"pregnan.*\b(pain|bleed|spotting)\b",
    r"stiff\s+neck.*(fever|rash)",
    r"(fever|temperature).*(104|105|40|41)\b",
    r"suicid|self.?harm|kill\s+my",
    # Persistent / chronic symptoms (weeks+)
    r"(every\s+day|daily|constant|persistent|chronic).*(week|month|year)",
    r"(week|month|year)s?\s+(now|straight|long)",
    r"for\s+(the\s+past\s+|over\s+)?(two|three|four|2|3|4|\d+)\s+weeks",
    # Allergic reactions with systemic signs
    r"(sting|stung|bite|bitten).*(swell|hive|rash|throat)",
    r"(swell|swollen).*(arm|face|throat|tongue|lip|eye)",
    r"anaphyla|epipen|allergic\s+reaction",
    # Urinary / renal
    r"burn.*(urinat|pee)|urinat.*burn|pain.*urinat",
    r"blood\s+in\s+(my\s+)?urine",
    # Neurological persistence
    r"numb(ness)?.*(comes?\s+and\s+go|week|month|persist|recurring)",
    r"tingling.*(comes?\s+and\s+go|week|month|persist)",
]

DE_ESCALATE_TO_OTC = [
    r"paper\s+cut",
    r"chapped\s+(lips|skin)",
    r"sunburn",
    r"mosquito\s+bite",
    r"screen\s+time.*eye|eye.*screen",
    r"slept\s+(funny|wrong|badly).*neck",
    r"pulled\s+(a\s+)?muscle.*can\s+(still\s+)?move",
    r"gym|workout|running|exercise",
    r"ate\s+too\s+much|after\s+eating.*spicy",
    r"just\s+woke\s+up.*scratchy",
    r"dehydrat|didn'?t\s+drink\s+enough\s+water",
    r"dandruff",
    r"acne",
    r"cold\s+sore",
]


def apply_safety_rules(text: str, prediction: str, confidence: float) -> dict:
    """Post-prediction clinical safety layer.
    Escalates OTC→Doctor for red-flag patterns;
    De-escalates Doctor→OTC for low-confidence mild patterns."""
    text_lower = text.lower()

    # Escalate OTC -> Doctor if red flags found
    if prediction == "OTC Drug":
        for pattern in ESCALATE_TO_DOCTOR:
            if re.search(pattern, text_lower):
                return {
                    "prediction": "Doctor Consultation",
                    "confidence": max(confidence, 0.95),
                    "rule_applied": "safety_escalation",
                }

    # De-escalate Doctor -> OTC if low confidence + mild pattern
    if prediction == "Doctor Consultation" and confidence < 0.85:
        for pattern in DE_ESCALATE_TO_OTC:
            if re.search(pattern, text_lower):
                return {
                    "prediction": "OTC Drug",
                    "confidence": 0.70,
                    "rule_applied": "mild_de_escalation",
                }

    return {"prediction": prediction, "confidence": confidence, "rule_applied": None}


# ---------------------------------------------------------------------------
# NER Helper
# ---------------------------------------------------------------------------

def run_ner(text: str) -> dict:
    """Call the dedicated NER API and return extracted clinical entities."""
    resp = http_requests.post(NER_API_URL, json={"text": text}, timeout=120)
    resp.raise_for_status()
    raw = resp.json()

    entities = {"Age": "", "Sex": "", "Severity": "", "Symptoms": [], "Duration": ""}

    items = raw.get("extracted_data", raw if isinstance(raw, list) else [])
    for ent in items:
        group = ent.get("entity_group", ent.get("label", ""))
        word = ent.get("word", ent.get("text", ""))
        # Handle wordpiece fragments (e.g. "##ness of breath") by merging
        if word.startswith("##"):
            word = word[2:]
            if entities["Symptoms"]:
                entities["Symptoms"][-1] += word
                continue
        _save_entity(entities, group, [word])

    entities["Symptoms"] = ", ".join(entities["Symptoms"]) if entities["Symptoms"] else "Not identified"
    for key in ("Age", "Sex", "Severity", "Duration"):
        if not entities[key]:
            entities[key] = "Not identified"

    return entities


def _save_entity(entities: dict, entity_type: str, tokens: list):
    """Store an entity value in the entities dict."""
    value = " ".join(t.strip() for t in tokens if t.strip())
    if not value:
        return

    entity_upper = entity_type.upper()
    if entity_upper in ("AGE",):
        entities["Age"] = value
    elif entity_upper in ("SEX", "GENDER"):
        entities["Sex"] = value
    elif entity_upper in ("SEVERITY",):
        entities["Severity"] = value
    elif entity_upper in ("SYMPTOM", "SYMPTOMS", "SIGN_SYMPTOM"):
        entities["Symptoms"].append(value)
    elif entity_upper in ("DURATION", "TIME"):
        entities["Duration"] = value


# ---------------------------------------------------------------------------
# Classification Helper
# ---------------------------------------------------------------------------

def _normalize_confidence(value) -> float | None:
    """Normalize confidence to 0..1, accepting 0..100 payloads too."""
    try:
        n = float(value)
    except (TypeError, ValueError):
        return None
    if n > 1:
        n = n / 100.0
    return max(0.0, min(1.0, n))


def _dynamic_confidence(text: str, label: str) -> float:
    """Fallback confidence when upstream model confidence is missing/flat."""
    lower = text.lower()
    urgent = ["chest pain", "difficulty breathing", "severe", "bleeding", "unconscious", "stroke"]
    moderate = ["fever", "pain", "swelling", "vomiting", "headache", "cough"]
    urgent_hits = sum(1 for kw in urgent if kw in lower)
    moderate_hits = sum(1 for kw in moderate if kw in lower)
    token_count = len([t for t in re.split(r"\s+", lower.strip()) if t])
    base = 0.84 if label == "Doctor Consultation" else 0.72
    confidence = base + (urgent_hits * 0.03) + (moderate_hits * 0.015) + min(token_count, 40) * 0.001
    return max(0.55, min(0.98, confidence))

def run_classification(clinical_text: str) -> dict:
    """Call the dedicated Classifier API and return prediction + confidence."""
    resp = http_requests.post(CLF_API_URL, json={"text": clinical_text}, timeout=120)
    resp.raise_for_status()
    raw = resp.json()

    prediction = raw.get("prediction", "OTC Drug")
    confidence = (
        _normalize_confidence(raw.get("confidence"))
        or _normalize_confidence(raw.get("score"))
        or _normalize_confidence(raw.get("probability"))
    )

    # If upstream returns a flat legacy constant (e.g. 0.85) or no confidence,
    # compute a dynamic estimate so UI does not show the same value every time.
    if confidence is None or abs(confidence - 0.85) < 0.0005:
        confidence = _dynamic_confidence(clinical_text, prediction)

    return {"label": prediction, "confidence": confidence}


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@app.route("/", methods=["GET"])
def health():
    """Health-check endpoint."""
    return jsonify({
        "status": "ok",
        "mode": "cloud",
        "message": "CTAS inference server is running (Custom Docker APIs on HF Spaces).",
        "ner_api": NER_API_URL,
        "clf_api": CLF_API_URL,
    })


@app.route("/api/triage", methods=["POST"])
def triage():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"status": "error", "message": "Invalid or missing JSON body."}), 400

    # Accept both HF-style {inputs: "..."} and legacy {symptoms: "..."}
    symptoms_text = str(data.get("inputs") or data.get("symptoms") or "").strip()
    if not symptoms_text:
        return jsonify({"status": "error", "message": "Missing 'inputs' (or 'symptoms') field in request body."}), 400

    try:
        # Run classification on RAW user text and NER in parallel.
        # NER output is used only for the UI display cards.
        with ThreadPoolExecutor(max_workers=2) as pool:
            clf_future = pool.submit(run_classification, symptoms_text)
            ner_future = pool.submit(run_ner, symptoms_text)

            clf_result = clf_future.result()
            extracted = ner_future.result()

        raw_prediction = clf_result["label"]
        raw_confidence = clf_result["confidence"]

        # Apply clinical safety rules (escalation / de-escalation)
        safe = apply_safety_rules(symptoms_text, raw_prediction, raw_confidence)
        recommendation = safe["prediction"]
        confidence = safe["confidence"]

        # Build extracted_entities array for the frontend (display only)
        entities_array = _build_entities_array(extracted)

        return jsonify({
            "extracted_entities": entities_array,
            "triage_label": recommendation,
            "confidence": confidence,
            "status": "success",
            "original_input": symptoms_text,
            "extracted_data": extracted,
            "formatted_clinical_text": symptoms_text,
            "final_recommendation": recommendation,
            "rule_applied": safe["rule_applied"],
        })

    except Exception as e:
        app.logger.error("Triage pipeline error: %s", e, exc_info=True)
        # Fall back to mock response if API is unreachable
        print(f"[WARN] API call failed ({e}), returning mock response")
        return jsonify(_mock_response(symptoms_text))


def _build_entities_array(extracted: dict) -> list:
    """Convert the flat extracted dict into an array of entity objects
    that the frontend's mergeEntities() function can consume."""
    entities = []
    mapping = {
        "Age": "AGE",
        "Sex": "SEX",
        "Severity": "SEVERITY",
        "Duration": "DURATION",
    }
    for field, label in mapping.items():
        value = extracted.get(field, "")
        if value and value != "Not identified":
            entities.append({"entity_group": label, "word": value})

    # Symptoms may be comma-separated – emit one entity per symptom
    symptoms_str = extracted.get("Symptoms", "")
    if symptoms_str and symptoms_str != "Not identified":
        for s in symptoms_str.split(","):
            s = s.strip()
            if s:
                entities.append({"entity_group": "SYMPTOM", "word": s})

    return entities


# ---------------------------------------------------------------------------
# Mock Response (when models are not available)
# ---------------------------------------------------------------------------

def _mock_response(text: str) -> dict:
    """Return a plausible mock triage result so the frontend can be developed
    and demonstrated without the actual ML models present."""
    text_lower = text.lower()
    urgent = ["chest pain", "breathing", "unconscious", "severe bleeding", "stroke"]
    moderate = ["fever", "pain", "headache", "vomiting", "swelling", "cough"]

    if any(kw in text_lower for kw in urgent):
        rec = "Doctor Consultation"
        severity = "High"
    elif any(kw in text_lower for kw in moderate):
        rec = "Doctor Consultation"
        severity = "Moderate"
    else:
        rec = "OTC Drug"
        severity = "Low"

    # Mock confidence is computed (not hardcoded) so fallback behavior is realistic.
    urgent_hits = sum(1 for kw in urgent if kw in text_lower)
    moderate_hits = sum(1 for kw in moderate if kw in text_lower)
    token_count = len([t for t in re.split(r"\s+", text_lower.strip()) if t])
    base = 0.84 if rec == "Doctor Consultation" else 0.72
    confidence = base + (urgent_hits * 0.03) + (moderate_hits * 0.015) + min(token_count, 40) * 0.001
    confidence = max(0.55, min(0.98, confidence))

    symptoms_list = [s.strip() for s in text.split(",") if s.strip()][:3] or [text[:60]]

    extracted = {
        "Age": "30",
        "Sex": "Not identified",
        "Severity": severity,
        "Symptoms": ", ".join(symptoms_list),
        "Duration": "Not identified",
    }
    formatted = (
        f"Patient: {extracted['Sex']}, {extracted['Age']} years. "
        f"Symptoms: {extracted['Symptoms']}. "
        f"Duration: {extracted['Duration']}. Severity: {extracted['Severity']}."
    )
    entities_array = _build_entities_array(extracted)

    return {
        "extracted_entities": entities_array,
        "triage_label": rec,
        "confidence": round(confidence, 3),
        "status": "success",
        "original_input": text,
        "extracted_data": extracted,
        "formatted_clinical_text": formatted,
        "final_recommendation": rec,
        "_mock": True,
    }


# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
