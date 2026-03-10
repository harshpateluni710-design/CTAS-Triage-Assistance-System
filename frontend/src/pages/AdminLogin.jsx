import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaUserShield, FaEnvelope, FaLock, FaArrowLeft } from 'react-icons/fa'
import { loginAdmin } from '../services/api'
import './AuthPages.css'

const AdminLogin = () => {
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
      const res = await loginAdmin(formData.email, formData.password)
      localStorage.setItem('token', res.token)
      localStorage.setItem('userRole', 'admin')
      localStorage.setItem('userEmail', res.user.email)
      localStorage.setItem('userName', res.user.fullName)
      navigate('/admin')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.')
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
          
          <h1>Admin Login</h1>
          <p className="auth-subtitle">System administrator access</p>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">
                <FaEnvelope /> Admin Email
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="admin@ctas.com"
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
                placeholder="Enter your password"
                required
              />
            </div>

            <button type="submit" className="auth-button admin-button" disabled={loading}>
              {loading ? 'Verifying...' : 'Login'}
            </button>
          </form>

          <div className="auth-footer">
            <p>Don't have an admin account? <Link to="/admin-register">Register here</Link></p>
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

export default AdminLogin
