import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaUser, FaEnvelope, FaPhone, FaBirthdayCake, FaLock, FaSave } from 'react-icons/fa'
import { getPatientProfile, updatePatientProfile, changePassword, deletePatientAccount } from '../services/api'
import './PatientProfile.css'

const PatientProfile = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getPatientProfile()
        setFormData(prev => ({
          ...prev,
          fullName: data.fullName || '',
          email: data.email || '',
          phone: data.phone || '',
          dateOfBirth: data.dateOfBirth || '',
        }))
      } catch (err) {
        console.error('Failed to load profile:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await updatePatientProfile({
        fullName: formData.fullName,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
      })

      if (formData.currentPassword && formData.newPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          setError('New passwords do not match')
          return
        }
        await changePassword(formData.currentPassword, formData.newPassword)
      }

      setSuccess('Profile updated successfully!')
      setIsEditing(false)
      setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }))
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile')
    }
  }

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      try {
        await deletePatientAccount()
        localStorage.clear()
        navigate('/')
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to delete account')
      }
    }
  }

  return (
    <div className="patient-profile-page">
      <div className="page-header">
        <div className="container">
          <Link to="/patient" className="back-button">
            <FaArrowLeft /> Back to Home
          </Link>
          <h1>Profile Settings</h1>
          <p>Manage your account information</p>
        </div>
      </div>

      <div className="container profile-content">
        {loading ? (
          <div className="empty-state"><p>Loading profile...</p></div>
        ) : (
        <div className="profile-card">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message" style={{color:'#10b981',marginBottom:'1rem'}}>{success}</div>}
          <div className="profile-avatar">
            <div className="avatar-circle">
              <FaUser />
            </div>
            <button className="edit-avatar-btn">Change Photo</button>
          </div>

          <form onSubmit={handleSubmit} className="profile-form">
            <h2>Personal Information</h2>
            
            <div className="form-grid">
              <div className="form-group">
                <label>
                  <FaUser /> Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  disabled={!isEditing}
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  <FaEnvelope /> Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={!isEditing}
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  <FaPhone /> Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={!isEditing}
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  <FaBirthdayCake /> Date of Birth
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  disabled={!isEditing}
                  required
                />
              </div>
            </div>

            {isEditing && (
              <>
                <h2>Change Password</h2>
                <div className="form-grid">
                  <div className="form-group">
                    <label>
                      <FaLock /> Current Password
                    </label>
                    <input
                      type="password"
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleChange}
                      placeholder="Enter current password"
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      <FaLock /> New Password
                    </label>
                    <input
                      type="password"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      placeholder="Enter new password"
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      <FaLock /> Confirm New Password
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="form-actions">
              {!isEditing ? (
                <button key="edit" type="button" className="btn btn-primary" onClick={() => setIsEditing(true)}>
                  Edit Profile
                </button>
              ) : (
                <>
                  <button key="save" type="submit" className="btn btn-primary">
                    <FaSave /> Save Changes
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>
                    Cancel
                  </button>
                </>
              )}
            </div>
          </form>

          <div className="danger-zone">
            <h2>Danger Zone</h2>
            <p>Once you delete your account, there is no going back. Please be certain.</p>
            <button className="btn btn-danger" onClick={handleDeleteAccount}>
              Delete Account
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  )
}

export default PatientProfile
