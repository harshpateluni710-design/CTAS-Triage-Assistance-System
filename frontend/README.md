# CTAS Frontend - Computerised Triage Assistance System

## Overview

A responsive, accessible React-based web application for AI-powered medical triage assessment. The system serves three distinct user roles: Patients, Doctors, and Administrators.

## Features

### Patient Interface
- Free-text symptom input with natural language processing
- Color-coded triage recommendations (Tier 0, 1, 2)
- Confidence scores and clinical protocol citations
- WCAG 2.1 AA compliant with comprehensive disclaimers
- GDPR-compliant privacy notices

### Doctor Dashboard
- Case validation interface for clinical review
- AI vs. professional judgment comparison
- Cohen's Kappa calculation for agreement metrics
- Read-only protocol library access
- Performance tracking

### Admin Dashboard
- Real-time system health monitoring
- Accuracy and recall metrics tracking
- Knowledge base management (upload/delete protocols)
- Bias audit with demographic performance analysis
- Interactive charts and visualizations

## Technical Stack

- **Framework**: React 18 with Vite
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Charts**: Recharts
- **Icons**: React Icons
- **Styling**: Custom CSS with CSS Variables

## Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Header.jsx
│   │   ├── Header.css
│   │   ├── TriageResult.jsx
│   │   └── TriageResult.css
│   ├── pages/              # Page-level components
│   │   ├── PatientInterface.jsx
│   │   ├── PatientInterface.css
│   │   ├── DoctorDashboard.jsx
│   │   ├── DoctorDashboard.css
│   │   ├── AdminDashboard.jsx
│   │   └── AdminDashboard.css
│   ├── services/           # API integration
│   │   └── api.js
│   ├── App.jsx            # Main application component
│   ├── App.css
│   ├── main.jsx           # Application entry point
│   └── index.css          # Global styles
├── index.html
├── package.json
├── vite.config.js
└── .env.example
```

## Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Python backend (FastAPI/Flask) running on port 8000

### Steps

1. **Navigate to frontend directory**
   ```powershell
   cd "d:\Projects\Triage_Assistance System\frontend"
   ```

2. **Install dependencies**
   ```powershell
   npm install
   ```

3. **Configure environment**
   ```powershell
   Copy-Item .env.example .env
   ```
   
   Edit `.env` to set your API URL:
   ```
   VITE_API_URL=http://localhost:8000/api
   ```

4. **Start development server**
   ```powershell
   npm run dev
   ```
   
   The application will be available at `http://localhost:3000`

5. **Build for production**
   ```powershell
   npm run build
   ```
   
   Production files will be in the `dist/` directory.

## Development Mode

The application includes mock data support for development without a backend. If the API is unavailable, the frontend will automatically return mock data for all endpoints.

## Accessibility Features

- WCAG 2.1 AA compliant
- Keyboard navigation support
- Screen reader friendly with ARIA labels
- Skip to main content link
- High contrast color schemes for triage levels
- Focus indicators on all interactive elements
- Responsive typography with `clamp()`

## Color Coding System

- **Tier 2 (Immediate)**: Red (#dc2626) - High urgency, emergency care
- **Tier 1 (24-48 Hours)**: Amber (#f59e0b) - Moderate urgency
- **Tier 0 (Self-care)**: Green (#10b981) - Low urgency, self-monitoring

## API Integration

The frontend communicates with the backend via RESTful APIs. See [api.js](src/services/api.js) for all endpoints:

### Patient Endpoints
- `POST /api/triage/analyze` - Analyze symptoms

### Doctor Endpoints
- `GET /api/doctor/cases` - Get patient cases
- `POST /api/doctor/validate` - Submit validation
- `GET /api/doctor/protocols` - Get protocols

### Admin Endpoints
- `GET /api/admin/metrics` - System metrics
- `GET /api/admin/bias-audit` - Bias analysis
- `GET /api/admin/knowledge-base` - Protocol list
- `POST /api/admin/upload-protocol` - Upload protocol
- `DELETE /api/admin/protocol/:id` - Delete protocol

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

This project is part of the Final Year Project (FYP) for the Computerised Triage Assistance System.

## Contact

For questions or issues, please contact the development team.
