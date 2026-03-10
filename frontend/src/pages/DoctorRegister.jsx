import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaUserMd, FaArrowLeft, FaEnvelope, FaLock, FaUser, FaPhone, FaIdCard, FaHospital, FaStethoscope } from 'react-icons/fa'
import { registerDoctor } from '../services/api'
import './AuthPages.css'

const DoctorRegister = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    licenseNumber: '',
    specialty: '',
    hospital: '',
    password: '',
    confirmPassword: ''
  })

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await registerDoctor({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        licenseNumber: formData.licenseNumber,
        specialty: formData.specialty,
        hospital: formData.hospital,
        password: formData.password,
      })
      localStorage.setItem('token', res.token)
      localStorage.setItem('userRole', 'doctor')
      localStorage.setItem('userEmail', res.user.email)
      localStorage.setItem('userName', res.user.fullName)
      navigate('/doctor')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page doctor-auth-page">
      <Link to="/" className="back-link">
        <FaArrowLeft /> Back to Home
      </Link>

      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-icon doctor-icon">
            <FaUserMd />
          </div>

          <h1>Doctor Registration</h1>
          <p className="auth-subtitle">Create your professional account</p>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-grid">
              <div className="form-group">
                <label><FaUser /> Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Dr. Jane Smith"
                  required
                />
              </div>

              <div className="form-group">
                <label><FaEnvelope /> Professional Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="jane.smith@hospital.com"
                  required
                />
              </div>

              <div className="form-group">
                <label><FaPhone /> Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 123-4567"
                  required
                />
              </div>

              <div className="form-group">
                <label><FaIdCard /> Medical License Number</label>
                <input
                  type="text"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  placeholder="MED-123456"
                  required
                />
              </div>

              <div className="form-group">
                <label><FaStethoscope /> Specialty</label>
                <select
                  name="specialty"
                  value={formData.specialty}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Specialty</option>
                  <option value="Emergency Medicine">Emergency Medicine</option>
                  <option value="Internal Medicine">Internal Medicine</option>
                  <option value="Family Medicine">Family Medicine</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Surgery">Surgery</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label><FaHospital /> Hospital/Clinic</label>
                <input
                  type="text"
                  name="hospital"
                  value={formData.hospital}
                  onChange={handleChange}
                  placeholder="City General Hospital"
                  required
                />
              </div>

              <div className="form-group">
                <label><FaLock /> Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min 8 characters"
                  required
                  minLength="8"
                />
              </div>

              <div className="form-group">
                <label><FaLock /> Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  required
                  minLength="8"
                />
              </div>
            </div>

            <button type="submit" className="auth-button doctor-button" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Doctor Account'}
            </button>
          </form>

          <div className="auth-footer">
            <p>Already have an account? <Link to="/doctor-login">Sign In</Link></p>
          </div>
        </div>

        <div className="auth-info">
          <h2>Clinical Portal</h2>
          <ul>
            <li>✓ Review &amp; validate AI triage assessments</li>
            <li>✓ Access clinical protocol library</li>
            <li>✓ Track validation performance metrics</li>
            <li>✓ Contribute to system improvement</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default DoctorRegister
