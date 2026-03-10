import React, { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FaPaperPlane, FaExclamationTriangle, FaArrowLeft, FaRedoAlt, FaDownload } from 'react-icons/fa'
import TriageResult from '../components/TriageResult'
import { analyzeSymptoms, saveAssessment } from '../services/api'
import './PatientInterface.css'

const PatientInterface = () => {
  const [symptoms, setSymptoms] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [slowWarning, setSlowWarning] = useState(false)
  const slowTimerRef = useRef(null)

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!symptoms.trim()) {
      setError('Please describe your symptoms')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    setSlowWarning(false)

    // Show a "waking up" message if the request takes >10 s
    slowTimerRef.current = setTimeout(() => setSlowWarning(true), 10000)

    try {
      const data = await analyzeSymptoms(symptoms)
      if (data.status === 'error') {
        setError(data.message || 'Unable to connect to the cloud AI server. Please try again in a moment.')
      } else {
        setResult(data)
        // Auto-save assessment to history (best-effort)
        try {
          const token = localStorage.getItem('token')
          if (token) {
            await saveAssessment({
              symptoms,
              extractedData: data.extracted_data,
              formattedText: data.formatted_clinical_text,
              recommendation: data.final_recommendation,
              confidence: data.confidence,
            })
          }
        } catch (_) { /* silent – history save is non-critical */ }
      }
    } catch (err) {
      if (err.message === 'MODEL_LOADING') {
        setError('The AI models are still warming up on the cloud server. Please wait a moment and try again.')
      } else {
        setError('Unable to connect to the cloud AI server. Please try again in a moment.')
      }
      console.error('Error analyzing symptoms:', err)
    } finally {
      clearTimeout(slowTimerRef.current)
      slowTimerRef.current = null
      setLoading(false)
      setSlowWarning(false)
    }
  }

  const handleReset = () => {
    setSymptoms('')
    setResult(null)
    setError(null)
  }

  const handleExport = () => {
    if (!result) return
    const lines = [
      '=== CTAS Triage Report ===',
      '',
      `Date: ${new Date().toLocaleString()}`,
      '',
      '--- Original Input ---',
      result.original_input,
      '',
      '--- Extracted Clinical Profile ---',
      `Age: ${result.extracted_data?.Age}`,
      `Sex: ${result.extracted_data?.Sex}`,
      `Symptoms: ${result.extracted_data?.Symptoms}`,
      `Duration: ${result.extracted_data?.Duration}`,
      `Severity: ${result.extracted_data?.Severity}`,
      '',
      '--- Formatted Clinical Text ---',
      result.formatted_clinical_text,
      '',
      '--- Triage Recommendation ---',
      result.final_recommendation,
      result.confidence != null ? `Confidence: ${(result.confidence * 100).toFixed(1)}%` : '',
      '',
      'Disclaimer: This is an AI-assisted preliminary assessment and is NOT a substitute for professional medical advice.',
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'CTAS_Triage_Report.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="patient-interface" id="main-content">
      <div className="container">
        <Link to="/patient" className="back-link">
          <FaArrowLeft /> Back to Home
        </Link>

        <section className="intro-section">
          <h1>CTAS: Intelligent Triage Assistant</h1>
          <p className="disclaimer-subtitle">Not a substitute for professional medical advice.</p>
        </section>

        {/* --- View 1: Input Interface --- */}
        {!result && (
          <div className="card">
            <form onSubmit={handleSubmit} className="symptom-form">
              <label htmlFor="symptoms" className="form-label">
                Describe Your Symptoms
              </label>

              <textarea
                id="symptoms"
                className="symptom-input"
                rows="6"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="Please describe how you are feeling, including any symptoms, how long you've had them, and your age/gender..."
                aria-describedby="help-text"
                disabled={loading}
                required
              />

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || !symptoms.trim()}
                  aria-busy={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-small" aria-hidden="true"></span>
                      Processing via Cloud AI...
                    </>
                  ) : (
                    <>
                      <FaPaperPlane aria-hidden="true" />
                      Analyze Symptoms
                    </>
                  )}
                </button>
              </div>

              {loading && slowWarning && (
                <p className="slow-warning">Waking up the AI models, please hold...</p>
              )}
            </form>

            {error && (
              <div className="error-banner" role="alert">
                <FaExclamationTriangle aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* --- View 2: Results Dashboard --- */}
        {result && (
          <>
            <TriageResult result={result} />
            <div className="result-actions">
              <button className="btn btn-secondary" onClick={handleReset}>
                <FaRedoAlt aria-hidden="true" />
                Start New Assessment
              </button>
              <button className="btn btn-outline" onClick={handleExport}>
                <FaDownload aria-hidden="true" />
                Export Report
              </button>
            </div>
          </>
        )}

        <section className="disclaimer-section card" aria-labelledby="disclaimer-heading">
          <h2 id="disclaimer-heading">
            <FaExclamationTriangle aria-hidden="true" className="disclaimer-icon" />
            Important Medical Disclaimer
          </h2>
          <div className="disclaimer-content">
            <p>
              <strong>This system is NOT a diagnostic device.</strong> The assessment provided
              is for informational purposes only and should not be considered medical advice,
              diagnosis, or treatment.
            </p>
            <ul>
              <li>
                <strong>In case of emergency:</strong> Call your local emergency number (911
                in the US) immediately if you are experiencing a life-threatening situation.
              </li>
              <li>
                <strong>Professional consultation required:</strong> Always consult with a
                qualified healthcare provider for proper diagnosis and treatment.
              </li>
              <li>
                <strong>No doctor-patient relationship:</strong> Use of this system does not
                create a doctor-patient relationship.
              </li>
              <li>
                <strong>Data privacy:</strong> Your symptom descriptions are processed in
                accordance with GDPR guidelines. No personally identifiable health information
                (PII) is stored permanently.
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}

export default PatientInterface
