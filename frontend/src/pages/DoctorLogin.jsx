import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaUserMd, FaEnvelope, FaLock, FaArrowLeft } from 'react-icons/fa'
import { loginDoctor } from '../services/api'
import './AuthPages.css'

const DoctorLogin = () => {
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
      const res = await loginDoctor(formData.email, formData.password)
      localStorage.setItem('token', res.token)
      localStorage.setItem('userRole', 'doctor')
      localStorage.setItem('userEmail', res.user.email)
      localStorage.setItem('userName', res.user.fullName)
      navigate('/doctor')
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
          <div className="auth-icon doctor-icon">
            <FaUserMd />
          </div>
          
          <h1>Doctor Login</h1>
          <p className="auth-subtitle">Access clinical validation dashboard</p>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">
                <FaEnvelope /> Professional Email
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="doctor@hospital.com"
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

            <button type="submit" className="auth-button doctor-button" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="auth-footer">
            <p>Need access? <Link to="/doctor-register">Request Account</Link></p>
            <Link to="/forgot-password" className="forgot-link">Forgot Password?</Link>
          </div>
        </div>

        <div className="auth-info">
          <h2>Doctor Portal</h2>
          <ul>
            <li>✓ Validate AI triage assessments</li>
            <li>✓ Review clinical case history</li>
            <li>✓ Access protocol library</li>
            <li>✓ Track validation metrics</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default DoctorLogin
