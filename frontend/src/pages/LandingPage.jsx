import React from 'react'
import { Link } from 'react-router-dom'
import { FaUserInjured, FaUserMd, FaUserShield, FaHeartbeat, FaShieldAlt, FaChartLine, FaArrowRight } from 'react-icons/fa'
import './LandingPage.css'

/* Inline SVG illustrations for corporate look */
const HeroIllustration = () => (
  <svg viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="hero-illustration" aria-hidden="true">
    {/* Monitor/Dashboard */}
    <rect x="120" y="60" width="260" height="180" rx="12" fill="#1e293b" stroke="#334155" strokeWidth="2"/>
    <rect x="130" y="70" width="240" height="150" rx="8" fill="#0f172a"/>
    {/* Screen content - heartbeat line */}
    <path d="M150 155 L190 155 L200 120 L215 180 L230 140 L240 155 L350 155" stroke="#3b82f6" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <animate attributeName="stroke-dashoffset" from="400" to="0" dur="2s" repeatCount="indefinite"/>
    </path>
    <line x1="150" y1="155" x2="350" y2="155" stroke="#1e3a5f" strokeWidth="1" strokeDasharray="3"/>
    {/* Stats bars */}
    <rect x="150" y="90" width="40" height="8" rx="4" fill="#3b82f6" opacity="0.6"/>
    <rect x="150" y="104" width="60" height="8" rx="4" fill="#059669" opacity="0.6"/>
    {/* Dashboard circles */}
    <circle cx="320" cy="100" r="18" stroke="#3b82f6" strokeWidth="3" fill="none"/>
    <path d="M320 82 L320 100 L333 95" stroke="#3b82f6" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    {/* Stand */}
    <rect x="220" y="240" width="60" height="12" rx="3" fill="#334155"/>
    <rect x="200" y="252" width="100" height="6" rx="3" fill="#334155"/>
    {/* Floating elements */}
    <circle cx="80" cy="120" r="24" fill="#3b82f6" opacity="0.1"/>
    <path d="M72 120 L80 112 L88 120 L80 128Z" fill="#3b82f6" opacity="0.3"/>
    <circle cx="420" cy="100" r="18" fill="#059669" opacity="0.1"/>
    <path d="M414 100 L420 94 L426 100 L420 106Z" fill="#059669" opacity="0.3"/>
    {/* Shield icon */}
    <path d="M420 180 L420 200 C420 215 410 228 420 232 C430 228 420 215 420 200Z" fill="none" stroke="#f59e0b" strokeWidth="2" opacity="0.3"/>
    {/* Dots pattern */}
    <circle cx="100" cy="280" r="2" fill="#3b82f6" opacity="0.2"/>
    <circle cx="115" cy="280" r="2" fill="#3b82f6" opacity="0.2"/>
    <circle cx="130" cy="280" r="2" fill="#3b82f6" opacity="0.2"/>
    <circle cx="100" cy="295" r="2" fill="#3b82f6" opacity="0.2"/>
    <circle cx="115" cy="295" r="2" fill="#3b82f6" opacity="0.2"/>
    <circle cx="130" cy="295" r="2" fill="#3b82f6" opacity="0.2"/>
  </svg>
)

const LandingPage = () => {
  return (
    <div className="landing-page">
      {/* Navigation Bar */}
      <nav className="landing-nav">
        <div className="container nav-content">
          <div className="nav-brand">
            <FaHeartbeat className="brand-icon" />
            <div>
              <span className="brand-name">CTAS</span>
              <span className="brand-tagline">Triage Assistance</span>
            </div>
          </div>
          <div className="nav-actions">
            <Link to="/patient-login" className="nav-cta">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="container hero-grid">
          <div className="hero-content">
            <div className="hero-badge">
              <FaShieldAlt /> AI-Powered Healthcare
            </div>
            <h1 className="hero-title">
              Intelligent Triage for <span className="text-accent">Better Outcomes</span>
            </h1>
            <p className="hero-description">
              CTAS leverages advanced BioBERT AI to deliver rapid, accurate preliminary 
              health assessments — empowering patients with 24/7 clinical-grade triage guidance.
            </p>
            <div className="hero-actions">
              <Link to="/patient-login" className="btn-hero-primary">
                Start Assessment <FaArrowRight />
              </Link>
              <Link to="/doctor-login" className="btn-hero-secondary">
                Clinical Portal
              </Link>
            </div>
            <div className="hero-stats">
              <div className="hero-stat">
                <strong>24/7</strong>
                <span>Availability</span>
              </div>
              <div className="stat-divider" />
              <div className="hero-stat">
                <strong>3-Tier</strong>
                <span>CTAS Protocol</span>
              </div>
              <div className="stat-divider" />
              <div className="hero-stat">
                <strong>BioBERT</strong>
                <span>AI Engine</span>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <HeroIllustration />
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="roles-section">
        <div className="container">
          <div className="section-header">
            <span className="section-label">Access Portals</span>
            <h2>Select Your Role</h2>
            <p>Choose the appropriate portal to access CTAS features designed for your role.</p>
          </div>
          <div className="roles-grid">
            <Link to="/patient-login" className="role-card patient-card">
              <div className="role-icon-wrap patient-icon-wrap">
                <FaUserInjured />
              </div>
              <h3>Patient Portal</h3>
              <p>Get instant triage assessment for your symptoms</p>
              <ul className="role-features">
                <li>24/7 Available</li>
                <li>Immediate Results</li>
                <li>Privacy Protected</li>
              </ul>
              <span className="role-link">Access Portal <FaArrowRight /></span>
            </Link>

            <Link to="/doctor-login" className="role-card doctor-card">
              <div className="role-icon-wrap doctor-icon-wrap">
                <FaUserMd />
              </div>
              <h3>Doctor Dashboard</h3>
              <p>Validate AI assessments and review clinical cases</p>
              <ul className="role-features">
                <li>Case Management</li>
                <li>Protocol Library</li>
                <li>Performance Tracking</li>
              </ul>
              <span className="role-link">Access Dashboard <FaArrowRight /></span>
            </Link>

            <Link to="/admin-login" className="role-card admin-card">
              <div className="role-icon-wrap admin-icon-wrap">
                <FaUserShield />
              </div>
              <h3>Admin Console</h3>
              <p>Monitor system health and manage protocols</p>
              <ul className="role-features">
                <li>System Metrics</li>
                <li>Bias Monitoring</li>
                <li>Data Management</li>
              </ul>
              <span className="role-link">Access Console <FaArrowRight /></span>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <span className="section-label">Capabilities</span>
            <h2>Why Choose CTAS?</h2>
          </div>
          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-icon-wrap">
                <FaHeartbeat />
              </div>
              <h3>AI-Powered Analysis</h3>
              <p>Advanced BioBERT model fine-tuned on clinical data for accurate symptom extraction and triage classification.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon-wrap">
                <FaShieldAlt />
              </div>
              <h3>Patient Safety First</h3>
              <p>Engineered with recall-priority design — minimising missed urgent cases above all other metrics.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon-wrap">
                <FaChartLine />
              </div>
              <h3>Clinical Validation</h3>
              <p>Continuous feedback loop with healthcare professionals ensures ever-improving assessment quality.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer Footer */}
      <footer className="disclaimer-footer">
        <div className="container">
          <p>
            <strong>Medical Disclaimer:</strong> CTAS is an AI-assisted preliminary assessment tool 
            and is NOT a substitute for professional medical advice, diagnosis, or treatment.
          </p>
          <p className="copyright">© {new Date().getFullYear()} CTAS — Computerised Triage Assistance System</p>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
