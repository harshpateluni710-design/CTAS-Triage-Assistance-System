import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaCalendar, FaEye } from 'react-icons/fa'
import { getPatientHistory } from '../services/api'
import './PatientHistory.css'

const PatientHistory = () => {
  const navigate = useNavigate()
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setError('')
        const data = await getPatientHistory()
        setAssessments(data)
      } catch (err) {
        console.error('Failed to load history:', err)
        if ([401, 403].includes(err.response?.status)) {
          localStorage.removeItem('token')
          localStorage.removeItem('userRole')
          localStorage.removeItem('userEmail')
          localStorage.removeItem('userName')
          navigate('/patient-login', { replace: true })
          return
        }
        setError('Unable to load your assessment history right now. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [navigate])

  const getTierInfo = (tier) => {
    switch (tier) {
      case 1:
        return { label: 'Doctor Consultation', class: 'tier-1-badge' }
      case 0:
        return { label: 'OTC Drug', class: 'tier-0-badge' }
      default:
        return { label: 'Unknown', class: '' }
    }
  }

  return (
    <div className="patient-history-page">
      <div className="page-header">
        <div className="container">
          <Link to="/patient" className="back-button">
            <FaArrowLeft /> Back to Home
          </Link>
          <h1>Assessment History</h1>
          <p>Review your past triage assessments</p>
        </div>
      </div>

      <div className="container history-content">
        {loading ? (
          <div className="empty-state"><p>Loading...</p></div>
        ) : error ? (
          <div className="empty-state"><p>{error}</p></div>
        ) : assessments.length === 0 ? (
          <div className="empty-state">
            <p>No assessments found</p>
            <Link to="/patient/assessment" className="btn btn-primary">
              Start Your First Assessment
            </Link>
          </div>
        ) : (
          <div className="assessments-list">
            {assessments.map((assessment) => {
              const tierInfo = getTierInfo(assessment.tier)
              const normalizedConfidence =
                assessment.confidence != null && Number(assessment.confidence) <= 1
                  ? Number(assessment.confidence) * 100
                  : Number(assessment.confidence || 0)

              return (
                <div key={assessment.id} className="assessment-card">
                  <div className="assessment-header">
                    <div className="assessment-meta">
                      <FaCalendar />
                      <span>{new Date(assessment.date).toLocaleString()}</span>
                    </div>
                    <span className={`tier-badge ${tierInfo.class}`}>
                      {tierInfo.label}
                    </span>
                  </div>

                  <div className="assessment-body">
                    <h3>Symptoms:</h3>
                    <p>{assessment.symptoms}</p>
                  </div>

                  <div className="assessment-footer">
                    <div className="confidence-badge">
                      Confidence: {normalizedConfidence.toFixed(1)}%
                    </div>
                    <Link to={`/patient/assessment/${assessment.id}`} className="view-button">
                      <FaEye /> View Details
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default PatientHistory
