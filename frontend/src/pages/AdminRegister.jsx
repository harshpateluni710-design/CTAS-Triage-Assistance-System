import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaUserShield, FaEnvelope, FaLock, FaUser, FaArrowLeft } from 'react-icons/fa'
import { registerAdmin } from '../services/api'
import './AuthPages.css'

const AdminRegister = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
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
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }
    try {
      const res = await registerAdmin({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
      })
      localStorage.setItem('token', res.token)
      localStorage.setItem('userRole', 'admin')
      localStorage.setItem('userEmail', res.user.email)
      localStorage.setItem('userName', res.user.fullName)
      navigate('/admin')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page admin-auth-page">
      <Link to="/" className="back-link">
        <FaArrowLeft /> Back to Home
      </Link>

      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-icon admin-icon">
            <FaUserShield />
          </div>

          <h1>Admin Registration</h1>
          <p className="auth-subtitle">Create your administrator account</p>

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
                placeholder="System Administrator"
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
                placeholder="admin@organisation.com"
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
                placeholder="Min 8 characters"
                required
                minLength="8"
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
                placeholder="Re-enter password"
                required
                minLength="8"
              />
            </div>

            <button type="submit" className="auth-button admin-button" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Admin Account'}
            </button>
          </form>

          <div className="auth-footer">
            <p>Already have an account? <Link to="/admin-login">Sign in here</Link></p>
          </div>
        </div>

        <div className="auth-info">
          <h2>Admin Console</h2>
          <ul>
            <li>✓ Monitor system performance &amp; metrics</li>
            <li>✓ Manage clinical knowledge base</li>
            <li>✓ Review bias audit reports</li>
            <li>✓ Oversee user &amp; assessment data</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default AdminRegister
