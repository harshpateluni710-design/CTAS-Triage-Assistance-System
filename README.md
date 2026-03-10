# Computerised Triage Assistance System (CTAS)

## Project Overview

A web-based AI system that analyzes unstructured patient symptom descriptions and provides triage urgency recommendations using BioBERT-based NER and classification models. The system prioritizes patient safety through a clinical safety rules layer and comprehensive bias monitoring.

## Architecture

```
User Input (raw text)
    │
    ├──→ BioBERT Classifier (HF Space) → Triage prediction (OTC Drug / Doctor Consultation)
    │         │
    │         └──→ Clinical Safety Rules (escalation / de-escalation)
    │
    └──→ BioBERT NER (HF Space) → Extracted entities (display only)
```

Both API calls run **in parallel**. The classifier always receives the raw user text, never NER output.

## Project Structure

```
├── backend/
│   ├── app.py                 # Flask server with triage pipeline + safety rules
│   ├── database.py            # Supabase/PostgreSQL connection
│   ├── requirements.txt       # Python dependencies
│   ├── supabase_schema.sql    # Database schema (users, assessments, protocols)
│   ├── .env.example           # Backend env vars template
│   └── routes/
│       ├── auth.py            # JWT auth (patient/doctor/admin)
│       ├── patient.py         # Patient history & analytics
│       ├── doctor.py          # Case validation & protocols
│       └── admin.py           # System metrics, bias audit, knowledge base
├── frontend/
│   ├── src/
│   │   ├── components/        # Header, TriageResult
│   │   ├── pages/             # Patient, Doctor, Admin dashboards
│   │   └── services/api.js    # API integration layer
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example           # Frontend env vars template
└── README.md
```

## Setup Instructions

### Prerequisites
- Python 3.9+
- Node.js 18+
- A Supabase project (free tier works)

### 1. Backend Setup

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Copy and fill in environment variables
cp .env.example .env
# Edit .env with your Supabase credentials and JWT secret

# Run the database schema on your Supabase SQL Editor
# (paste contents of supabase_schema.sql)

# Start the backend server
python app.py
```

The backend runs at **http://localhost:5000**.

### 2. Frontend Setup

```bash
cd frontend

# Install Node dependencies
npm install

# Copy and fill in environment variables
cp .env.example .env
# Edit .env — see below for values

# Start the development server
npm run dev
```

The frontend runs at **http://localhost:3000**.

### Frontend `.env` Configuration

```env
# Points to the Flask backend triage endpoint
VITE_HF_API_URL=http://localhost:5000/api/triage

# Internal REST API (auth, patient, doctor, admin routes)
VITE_API_URL=http://localhost:5000/api
```

## Features

### Patient Interface
- Free-text symptom input
- AI-powered triage (OTC Drug / Doctor Consultation)
- NER-extracted clinical profile cards (Age, Sex, Symptoms, Duration, Severity)
- Confidence scores
- Assessment history & analytics

### Doctor Dashboard
- Patient case validation
- AI vs. professional judgment comparison
- Clinical protocol library (searchable)

### Admin Dashboard
- System health monitoring
- Accuracy and recall metrics
- Knowledge base management (CRUD protocols)
- Bias audit with demographic analysis

## Clinical Safety Rules

The backend applies post-prediction safety rules:

- **Escalation** (OTC → Doctor): Triggered by red-flag patterns like chest pain radiating, blood in stool, seizures, persistent symptoms for weeks, allergic swelling, urinary burning, etc.
- **De-escalation** (Doctor → OTC): Triggered only when confidence < 0.85 AND text matches mild patterns like sunburn, paper cut, dandruff, acne, etc.

## Technology Stack

- **Frontend:** React 18, Vite, React Router v6, Axios, Recharts
- **Backend:** Flask, Flask-CORS, PyJWT, psycopg2
- **Database:** Supabase (PostgreSQL)
- **ML Models:** BioBERT NER + BioBERT Sequence Classifier (hosted on HF Spaces)
- **NER API:** https://harsh710000-ctas-ner-api.hf.space
- **Classifier API:** https://harsh710000-biobert-classifier-api.hf.space
   - Set up RAG pipeline with vector database
   - Connect to frontend APIs

3. **Model Training** (Week 6-9)
   - Fine-tune BioBERT for medical NER
   - Train baseline models
   - Hyperparameter optimization

## License & Ethics

This project adheres to:
- WCAG 2.1 AA accessibility standards
- GDPR data privacy guidelines
- Medical ethics and patient safety protocols
- Bias monitoring and fairness audits

## Contact

For questions about this project, please refer to the project documentation or contact the development team.

---

**Note:** The frontend is complete and functional with mock data. Backend integration is required for production use.
