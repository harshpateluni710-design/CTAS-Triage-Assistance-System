import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaCheckCircle, FaTimesCircle, FaBook, FaSearch, FaSignOutAlt, FaUserCircle } from 'react-icons/fa'
import { getPatientCases, submitValidation, getProtocols, getDoctorStats } from '../services/api'
import './DoctorDashboard.css'

const DoctorDashboard = () => {
  const navigate = useNavigate()
  const [cases, setCases] = useState([])
  const [protocols, setProtocols] = useState([])
  const [activeTab, setActiveTab] = useState('validation')
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [stats, setStats] = useState({
    totalAssessments: 0,
    validatedAssessments: 0,
    agreementCount: 0,
    kappaPercent: null,
  })

  useEffect(() => {
    loadData()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('user')
    navigate('/')
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const [casesData, protocolsData, statsData] = await Promise.all([
        getPatientCases(),
        getProtocols(),
        getDoctorStats(),
      ])
      setCases(casesData)
      setProtocols(protocolsData)
      setStats(statsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleValidation = async (caseId, isCorrect, doctorTier) => {
    try {
      await submitValidation(caseId, isCorrect, doctorTier)
      // Update local state
      setCases(cases.map(c => 
        c.id === caseId 
          ? { ...c, validated: true, doctorAgreement: isCorrect, doctorTier }
          : c
      ))
      const statsData = await getDoctorStats()
      setStats(statsData)
    } catch (error) {
      console.error('Error submitting validation:', error)
    }
  }

  const filteredProtocols = protocols.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const pendingCases = cases.filter(c => !c.validated)
  const verifiedCases = cases.filter(c => c.validated)

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" aria-label="Loading"></div>
      </div>
    )
  }

  return (
    <div className="doctor-dashboard" id="main-content">
      <div className="container">
        <div className="dashboard-header">
          <div>
            <h1>Clinical Validation Dashboard</h1>
            <p className="dashboard-intro">
              Review AI triage assessments and validate against professional judgment to improve system accuracy.
            </p>
          </div>
          <div style={{display:'flex',gap:'0.75rem'}}>
            <button onClick={() => navigate('/doctor/profile')} className="logout-btn" style={{background:'var(--brand-accent)'}}>
              <FaUserCircle /> Profile
            </button>
            <button onClick={handleLogout} className="logout-btn">
              <FaSignOutAlt /> Logout
            </button>
          </div>
        </div>

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'validation' ? 'active' : ''}`}
            onClick={() => setActiveTab('validation')}
            aria-selected={activeTab === 'validation'}
            role="tab"
          >
            Case Validation
          </button>
          <button
            className={`tab ${activeTab === 'protocols' ? 'active' : ''}`}
            onClick={() => setActiveTab('protocols')}
            aria-selected={activeTab === 'protocols'}
            role="tab"
          >
            Protocol Library
          </button>
        </div>

        {activeTab === 'validation' && (
          <section className="validation-section" aria-labelledby="validation-heading">
            <h2 id="validation-heading" className="sr-only">Patient Case Validation</h2>
            
            <div className="stats-cards">
              <div className="stat-card">
                <div className="stat-value">{stats.totalAssessments}</div>
                <div className="stat-label">Total Assessments</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  {stats.validatedAssessments}
                </div>
                <div className="stat-label">Validated</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  {stats.agreementCount}
                </div>
                <div className="stat-label">Agreement</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  {stats.kappaPercent == null ? 'N/A' : `${stats.kappaPercent}%`}
                </div>
                <div className="stat-label">Cohen's Kappa</div>
              </div>
            </div>

            {cases.length === 0 ? (
              <p className="empty-state">No cases available for validation.</p>
            ) : (
              <>
                <div className="cases-section">
                  <h3 className="cases-section-title">Pending Validation ({pendingCases.length})</h3>
                  <div className="cases-list">
                    {pendingCases.length === 0 ? (
                      <p className="empty-state">No pending assessments.</p>
                    ) : (
                      pendingCases.map((caseData) => (
                        <CaseCard
                          key={caseData.id}
                          caseData={caseData}
                          onValidate={handleValidation}
                        />
                      ))
                    )}
                  </div>
                </div>

                <div className="cases-section">
                  <h3 className="cases-section-title">Verified Assessments ({verifiedCases.length})</h3>
                  <div className="cases-list">
                    {verifiedCases.length === 0 ? (
                      <p className="empty-state">No verified assessments yet.</p>
                    ) : (
                      verifiedCases.map((caseData) => (
                        <CaseCard
                          key={caseData.id}
                          caseData={caseData}
                          onValidate={handleValidation}
                        />
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {activeTab === 'protocols' && (
          <section className="protocols-section" aria-labelledby="protocols-heading">
            <h2 id="protocols-heading" className="sr-only">Clinical Protocol Library</h2>
            
            <div className="search-bar">
              <FaSearch aria-hidden="true" />
              <input
                type="search"
                placeholder="Search protocols..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search clinical protocols"
              />
            </div>

            <div className="protocols-list">
              {filteredProtocols.length === 0 ? (
                <p className="empty-state">No protocols found.</p>
              ) : (
                filteredProtocols.map((protocol) => (
                  <div key={protocol.id} className="protocol-card card">
                    <div className="protocol-header">
                      <FaBook aria-hidden="true" className="protocol-icon" />
                      <h3>{protocol.title}</h3>
                    </div>
                    <p className="protocol-type">{protocol.type}</p>
                    <p className="protocol-description">{protocol.description}</p>
                    {protocol.criteria && (
                      <div className="protocol-criteria">
                        <strong>Criteria:</strong>
                        <ul>
                          {protocol.criteria.map((criterion, idx) => (
                            <li key={idx}>{criterion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

const CaseCard = ({ caseData, onValidate }) => {
  const aiTier =
    caseData.aiTier ??
    (caseData.recommendation === 'Doctor Consultation' ? 1 :
      caseData.recommendation === 'OTC Drug' ? 0 :
      caseData.tier ?? 0)
  const disagreeTier = aiTier === 1 ? 0 : 1

  const normalizedConfidence =
    caseData.confidence != null && Number(caseData.confidence) <= 1
      ? Number(caseData.confidence) * 100
      : Number(caseData.confidence || 0)

  const getTierLabel = (tier) => {
    switch (tier) {
      case 1: return 'Doctor Consultation'
      case 0: return 'OTC Drug'
      default: return 'Unknown'
    }
  }

  const getTierClass = (tier) => {
    switch (tier) {
      case 2: return 'tier-2'
      case 1: return 'tier-1'
      case 0: return 'tier-0'
      default: return ''
    }
  }

  return (
    <div className={`case-card card ${caseData.validated ? 'validated' : ''}`}>
      <div className="case-header">
        <span className="case-id">Case #{caseData.id}</span>
        <span className="case-date">{new Date(caseData.date).toLocaleDateString()}</span>
      </div>

      <div className="case-symptoms">
        <strong>Symptoms:</strong>
        <p>{caseData.symptoms}</p>
      </div>

      <div className="case-assessment">
        <div className="ai-assessment">
          <strong>AI Triage:</strong>
          <span className={`tier-badge ${getTierClass(aiTier)}`}>
            {getTierLabel(aiTier)}
          </span>
          <span className="confidence">({normalizedConfidence.toFixed(2)}% confidence)</span>
        </div>

        {!caseData.validated ? (
          <div className="validation-controls">
            <p className="validation-note">
              <strong>Your Professional Judgment:</strong> confirm whether you agree with the AI recommendation.
            </p>

            <div className="validation-buttons">
              <button
                className="btn btn-success"
                onClick={() => onValidate(caseData.id, true, aiTier)}
                aria-label="Agree with AI assessment"
              >
                <FaCheckCircle aria-hidden="true" />
                Agree
              </button>
              <button
                className="btn btn-danger"
                onClick={() => onValidate(caseData.id, false, disagreeTier)}
                aria-label="Disagree with AI assessment"
              >
                <FaTimesCircle aria-hidden="true" />
                Disagree
              </button>
            </div>
          </div>
        ) : (
          <div className="validation-result">
            <strong>Your Assessment:</strong>
            <span className={`tier-badge ${getTierClass(caseData.doctorTier)}`}>
              {getTierLabel(caseData.doctorTier)}
            </span>
            {caseData.doctorAgreement ? (
              <span className="agreement-status agree">
                <FaCheckCircle aria-hidden="true" /> Agreement
              </span>
            ) : (
              <span className="agreement-status disagree">
                <FaTimesCircle aria-hidden="true" /> Disagreement
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default DoctorDashboard
