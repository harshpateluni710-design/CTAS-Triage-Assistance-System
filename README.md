# Computerised Triage Assistance System (CTAS)

## Project Overview

A web-based AI system that analyzes unstructured patient symptom descriptions and provides triage urgency recommendations. The system prioritizes patient safety through comprehensive clinical validation and bias monitoring.

## Project Structure

```
Triage_Assistance System/
├── frontend/                 # React-based UI application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Patient, Doctor, Admin dashboards
│   │   ├── services/       # API integration layer
│   │   └── ...
│   ├── package.json
│   ├── README.md           # Frontend documentation
│   └── setup.ps1           # Frontend setup script
├── backend/                 # Python backend (to be implemented)
│   └── (FastAPI/Flask)
├── models/                  # ML models and weights (to be implemented)
│   └── (BioBERT fine-tuned)
├── data/                    # Training and validation data
│   └── (MIMIC-III/MACCROBAT)
├── PRD.md                  # Product Requirements Document
└── UI_DEVELOPMENT_BRIEF.md # UI Implementation guide
```

## Quick Start

### Frontend Setup

1. Navigate to frontend directory:
   ```powershell
   cd "d:\Projects\Triage_Assistance System\frontend"
   ```

2. Run setup script:
   ```powershell
   .\setup.ps1
   ```

3. Start development server:
   ```powershell
   npm run dev
   ```

4. Open browser to `http://localhost:3000`

## Features Implemented

### ✅ Patient Interface
- Free-text symptom input
- AI-powered triage recommendations (Tier 0/1/2)
- Color-coded urgency levels
- Confidence scores and clinical citations
- Comprehensive medical disclaimers
- GDPR-compliant privacy notices

### ✅ Doctor Dashboard
- Patient case validation interface
- AI vs. professional judgment comparison
- Cohen's Kappa calculation
- Clinical protocol library
- Performance tracking

### ✅ Admin Dashboard
- Real-time system health monitoring
- Accuracy and recall metrics (targets: ≥85% and ≥90%)
- Knowledge base management
- Bias audit with demographic analysis
- Interactive performance charts

## Technology Stack

### Frontend (✅ Complete)
- React 18 with Vite
- React Router v6
- Axios for API calls
- Recharts for visualization
- Custom CSS with accessibility features

### Backend (⏳ To Be Implemented)
- Python with FastAPI or Flask
- BioBERT for NLP
- FAISS/ChromaDB for RAG
- LangChain for orchestration

### ML Models (⏳ To Be Implemented)
- BioBERT (`dmis-lab/biobert-v1.1-pubmed`)
- Baseline models (SVM, Random Forest)
- Fine-tuned for medical NER

## Development Timeline

| Phase | Weeks | Status |
|-------|-------|--------|
| Frontend & UI Development | 1-3 | ✅ Complete |
| Data Engineering & Preprocessing | 4-5 | ⏳ Pending |
| NLP Module & Fine-Tuning | 6-9 | ⏳ Pending |
| RAG Pipeline & Backend | 10-13 | ⏳ Pending |
| Evaluation & Final Submission | 14-17 | ⏳ Pending |

**Deadline:** April 25, 2026

## Success Metrics

- **Recall for Urgent Cases:** >90% (Critical for safety)
- **False Negatives:** <5% for critical cases
- **Technical Accuracy:** >85%
- **Usability (SUS Score):** >70

## Documentation

- [PRD.md](PRD.md) - Product Requirements Document
- [UI_DEVELOPMENT_BRIEF.md](UI_DEVELOPMENT_BRIEF.md) - UI implementation guide
- [frontend/README.md](frontend/README.md) - Frontend technical documentation

## Current Status

**Week 1-3 Complete (January 28, 2026)**

The frontend UI is fully implemented with:
- All three user interfaces (Patient, Doctor, Admin)
- Complete routing and navigation
- WCAG 2.1 AA accessibility compliance
- Mobile-responsive design
- Mock API integration for development
- Ready for backend integration

## Next Steps

1. **Data Acquisition** (Week 4)
   - Obtain MIMIC-III or MACCROBAT datasets
   - Set up data preprocessing pipeline

2. **Backend Development** (Week 10-13)
   - Implement FastAPI/Flask server
   - Integrate BioBERT model
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
