import React from 'react'
import { FaExclamationCircle, FaClock, FaCheckCircle, FaUser, FaNotesMedical, FaHourglass, FaThermometerHalf } from 'react-icons/fa'
import './TriageResult.css'

const TriageResult = ({ result }) => {
  const { extracted_data, final_recommendation, confidence } = result

  const getRecommendationConfig = (rec) => {
    switch (rec) {
      case 'Doctor Consultation':
        return {
          colorClass: 'rec-immediate',
          icon: <FaExclamationCircle />,
          description: 'Your symptoms require professional medical evaluation. Please schedule a consultation with a doctor as soon as possible.',
        }
      case 'OTC Drug':
      default:
        return {
          colorClass: 'rec-selfcare',
          icon: <FaCheckCircle />,
          description: 'Your symptoms can likely be managed with over-the-counter medication. Monitor your condition and seek professional care if symptoms worsen.',
        }
    }
  }

  const config = getRecommendationConfig(final_recommendation)

  return (
    <div className="triage-results" role="region" aria-label="Triage Assessment Results">

      {/* Card A: Extracted Clinical Profile (NER Output) */}
      <div className="card extraction-card">
        <h2 className="card-title">Extracted Clinical Profile</h2>
        <div className="profile-grid">
          <div className="profile-item">
            <FaUser className="profile-icon" aria-hidden="true" />
            <div>
              <span className="profile-label">Patient Demographic</span>
              <span className="profile-value">{extracted_data?.Sex} | {extracted_data?.Age}</span>
            </div>
          </div>
          <div className="profile-item">
            <FaNotesMedical className="profile-icon symptom-highlight" aria-hidden="true" />
            <div>
              <span className="profile-label">Identified Symptoms</span>
              <span className="profile-value symptom-text">{extracted_data?.Symptoms}</span>
            </div>
          </div>
          <div className="profile-item">
            <FaHourglass className="profile-icon" aria-hidden="true" />
            <div>
              <span className="profile-label">Timeline</span>
              <span className="profile-value">{extracted_data?.Duration}</span>
            </div>
          </div>
          <div className="profile-item">
            <FaThermometerHalf className="profile-icon" aria-hidden="true" />
            <div>
              <span className="profile-label">Assessed Severity</span>
              <span className="profile-value">{extracted_data?.Severity}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Card B: Final Triage Recommendation */}
      <div className="card recommendation-card">
        <h2 className="card-title">Triage Assessment</h2>
        <div className={`recommendation-badge ${config.colorClass}`}>
          {config.icon}
          <span>{final_recommendation}</span>
        </div>
        {confidence != null && (
          <p className="confidence-score">Confidence: {(confidence * 100).toFixed(1)}%</p>
        )}
        <p className="recommendation-description">{config.description}</p>
      </div>
    </div>
  )
}

export default TriageResult
