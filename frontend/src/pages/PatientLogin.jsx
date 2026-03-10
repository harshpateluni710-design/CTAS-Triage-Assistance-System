import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaUserInjured, FaEnvelope, FaLock, FaArrowLeft } from 'react-icons/fa'
import { loginPatient } from '../services/api'
import './AuthPages.css'

const PatientLogin = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await loginPatient(formData.email, formData.password)
      localStorage.setItem('token', res.token)
      localStorage.setItem('userRole', 'patient')
      localStorage.setItem('userEmail', res.user.email)
      localStorage.setItem('userName', res.user.fullName)
      navigate('/patient')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <Link to="/" className="back-link">
        <FaArrowLeft /> Back to Home
      </Link>
      
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-icon patient-icon">
            <FaUserInjured />
          </div>
          
          <h1>Patient Login</h1>
          <p className="auth-subtitle">Access your health assessment portal</p>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">
                <FaEnvelope /> Email Address
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter your email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">
                <FaLock /> Password
              </label>
              <input
                type="password"
                id="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter your password"
              />
            </div>

            <button type="submit" className="auth-button patient-button" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="auth-footer">
            <p>Don't have an account? <Link to="/patient-register">Register here</Link></p>
            <Link to="/forgot-password" className="forgot-link">Forgot Password?</Link>
          </div>
        </div>

        <div className="auth-info">
          <h2>Welcome to CTAS</h2>
          <ul>
            <li>✓ Get instant symptom assessment</li>
            <li>✓ View your assessment history</li>
            <li>✓ Access personalized health insights</li>
            <li>✓ Available 24/7</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default PatientLogin
