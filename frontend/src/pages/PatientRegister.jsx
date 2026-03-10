import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaUserInjured, FaEnvelope, FaLock, FaUser, FaPhone, FaArrowLeft, FaCalendar } from 'react-icons/fa'
import { registerPatient } from '../services/api'
import './AuthPages.css'

const PatientRegister = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }
    try {
      const res = await registerPatient({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        password: formData.password,
      })
      localStorage.setItem('token', res.token)
      localStorage.setItem('userRole', 'patient')
      localStorage.setItem('userEmail', res.user.email)
      localStorage.setItem('userName', res.user.fullName)
      navigate('/patient')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.')
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
          
          <h1>Patient Registration</h1>
          <p className="auth-subtitle">Create your account to access health assessments</p>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="fullName">
                <FaUser /> Full Name
              </label>
              <input
                type="text"
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">
                <FaEnvelope /> Email Address
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">
                <FaPhone /> Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="dateOfBirth">
                <FaCalendar /> Date of Birth
              </label>
              <input
                type="date"
                id="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                required
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
                placeholder="Create a strong password"
                required
                minLength={8}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">
                <FaLock /> Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Confirm your password"
                required
              />
            </div>

            <button type="submit" className="auth-button patient-button" disabled={loading}>
              {loading ? 'Creating Account...' : 'Register'}
            </button>
          </form>

          <div className="auth-footer">
            <p>Already have an account? <Link to="/patient-login">Login here</Link></p>
          </div>
        </div>

        <div className="auth-info">
          <h2>Join CTAS Today</h2>
          <ul>
            <li>✓ Free account creation</li>
            <li>✓ Secure and private</li>
            <li>✓ Instant symptom assessment</li>
            <li>✓ Track your health history</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default PatientRegister
