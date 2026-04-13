import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaCheckCircle, FaTimesCircle, FaBook, FaSearch, FaSignOutAlt, FaUserCircle } from 'react-icons/fa'
import { getDoctorAssessments, submitValidation, getProtocols } from '../services/api'
import './DoctorDashboard.css'

const computeStatsFromCases = (pendingCases, validatedCases) => {
  const agreementCount = validatedCases.filter(c => c.doctorAgreement).length
  const disagreementCount = validatedCases.length - agreementCount

  let kappaPercent = null
  if (validatedCases.length > 0) {
    let aiDoctor = 0
    let aiOtc = 0
    let docDoctor = 0
    let docOtc = 0

    validatedCases.forEach((c) => {
      const aiTier =
        c.aiTier ??
        (c.recommendation === 'Doctor Consultation' ? 1 :
          c.recommendation === 'OTC Drug' ? 0 :
          c.tier ?? 0)
      const docTier = Number(c.doctorTier)

      if (aiTier === 1) aiDoctor += 1
      else aiOtc += 1

      if (docTier === 1) docDoctor += 1
      else docOtc += 1
    })

    const n = validatedCases.length
    const po = agreementCount / n
    const pe = ((aiDoctor / n) * (docDoctor / n)) + ((aiOtc / n) * (docOtc / n))
    if (pe === 1) kappaPercent = 100
    else kappaPercent = Number((((po - pe) / (1 - pe)) * 100).toFixed(1))
  }

  return {
    totalAssessments: pendingCases.length + validatedCases.length,
    validatedAssessments: validatedCases.length,
    pendingAssessments: pendingCases.length,
    agreementCount,
    disagreementCount,
    kappaPercent,
  }
}

const DoctorDashboard = () => {
  const navigate = useNavigate()
  const [pendingCases, setPendingCases] = useState([])
  const [validatedCases, setValidatedCases] = useState([])
  const [protocols, setProtocols] = useState([])
  const [activeTab, setActiveTab] = useState('validation')
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [loadError, setLoadError] = useState('')
  const [stats, setStats] = useState({
    totalAssessments: 0,
    validatedAssessments: 0,
    agreementCount: 0,
    disagreementCount: 0,
    kappaPercent: null,
  })

  useEffect(() => {
    loadData()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userName')
    navigate('/')
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setLoadError('')
      const [assessmentsResult, protocolsResult] = await Promise.allSettled([
        getDoctorAssessments(),
        getProtocols(),
      ])

      const isAuthFailure = (result) =>
        result.status === 'rejected' && [401, 403].includes(result.reason?.response?.status)

      if (isAuthFailure(assessmentsResult)) {
        setLoadError('Your doctor session is invalid or expired. Please sign in again.')
        setPendingCases([])
        setValidatedCases([])
        setProtocols([])
        setStats({
          totalAssessments: 0,
          validatedAssessments: 0,
          agreementCount: 0,
          disagreementCount: 0,
          kappaPercent: null,
        })
        return
      }

      const loadedAssessments = assessmentsResult.status === 'fulfilled'
        ? assessmentsResult.value
        : { items: [], counts: null }
      const loadedPending = loadedAssessments.items.filter(c => !c.validated)
      const loadedValidated = loadedAssessments.items.filter(c => c.validated)
      const loadedProtocols = protocolsResult.status === 'fulfilled' ? protocolsResult.value : []

      setPendingCases(loadedPending)
      setValidatedCases(loadedValidated)
      setProtocols(loadedProtocols)

      setStats(loadedAssessments.counts || computeStatsFromCases(loadedPending, loadedValidated))

      if (
        assessmentsResult.status === 'fulfilled' &&
        loadedValidated.length === 0 &&
        Number(loadedAssessments.counts?.validatedAssessments || 0) > 0
      ) {
        setLoadError('Validated cases exist in stats but could not be listed. This indicates a backend endpoint mismatch.')
      }

      if (assessmentsResult.status === 'rejected') {
        setLoadError('Unable to load assessment data from backend right now. Please retry in a moment.')
      }

      if (assessmentsResult.status === 'rejected') {
        console.error('Error loading doctor assessments:', assessmentsResult.reason)
      }
      if (protocolsResult.status === 'rejected') {
        console.error('Error loading protocols:', protocolsResult.reason)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleValidation = async (caseId, isCorrect, doctorTier) => {
    try {
      await submitValidation(caseId, isCorrect, doctorTier)
      await loadData()
    } catch (error) {
      console.error('Error submitting validation:', error)
    }
  }

  const filteredProtocols = protocols.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
            className={`tab ${activeTab === 'validated' ? 'active' : ''}`}
            onClick={() => setActiveTab('validated')}
            aria-selected={activeTab === 'validated'}
            role="tab"
          >
            Validated Cases
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

        {(activeTab === 'validation' || activeTab === 'validated') && (
          <section className="validation-section" aria-labelledby="validation-heading">
            <h2 id="validation-heading" className="sr-only">Patient Case Validation</h2>

            {loadError && <p className="empty-state">{loadError}</p>}
            
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
                  {stats.disagreementCount}
                </div>
                <div className="stat-label">Disagreed</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  {stats.kappaPercent == null ? 'N/A' : `${stats.kappaPercent}%`}
                </div>
                <div className="stat-label">Cohen's Kappa</div>
              </div>
            </div>

            <div className="cases-list">
              {activeTab === 'validation' ? (
                pendingCases.length === 0 ? (
                  <p className="empty-state">No pending assessments available for validation.</p>
                ) : (
                  pendingCases.map((caseData) => (
                    <CaseCard
                      key={caseData.id}
                      caseData={caseData}
                      onValidate={handleValidation}
                    />
                  ))
                )
              ) : (
                validatedCases.length === 0 ? (
                  <p className="empty-state">No validated assessments available yet.</p>
                ) : (
                  validatedCases.map((caseData) => (
                    <CaseCard
                      key={caseData.id}
                      caseData={caseData}
                      onValidate={handleValidation}
                    />
                  ))
                )
              )}
            </div>
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
