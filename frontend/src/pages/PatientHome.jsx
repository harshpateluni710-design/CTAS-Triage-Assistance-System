import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaHistory, FaClipboardList, FaChartBar, FaUser, FaSignOutAlt } from 'react-icons/fa'
import './PatientHome.css'

const PatientHome = () => {
  const navigate = useNavigate()
  const userEmail = localStorage.getItem('userEmail') || 'patient@example.com'
  const userName = localStorage.getItem('userName') || userEmail

  const handleLogout = () => {
    localStorage.clear()
    navigate('/')
  }

  return (
    <div className="patient-home">
      <div className="patient-header">
        <div className="container">
          <div className="header-content">
            <h1>Welcome to Your Health Portal</h1>
            <p>Hi, {userName}</p>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </div>

      <div className="container patient-content">
        <div className="quick-actions">
          <Link to="/patient/assessment" className="action-card primary-action">
            <div className="action-icon">
              <FaClipboardList />
            </div>
            <h2>New Assessment</h2>
            <p>Get instant triage evaluation for your symptoms</p>
            <button className="action-button">Start Assessment</button>
          </Link>

          <Link to="/patient/history" className="action-card">
            <div className="action-icon">
              <FaHistory />
            </div>
            <h3>Assessment History</h3>
            <p>View your past assessments and recommendations</p>
          </Link>

          <Link to="/patient/analytics" className="action-card">
            <div className="action-icon">
              <FaChartBar />
            </div>
            <h3>Health Insights</h3>
            <p>Track your health patterns over time</p>
          </Link>

          <Link to="/patient/profile" className="action-card">
            <div className="action-icon">
              <FaUser />
            </div>
            <h3>Profile Settings</h3>
            <p>Manage your personal information</p>
          </Link>
        </div>

        <div className="info-section">
          <div className="info-card">
            <h3>Quick Tips</h3>
            <ul>
              <li>Be as specific as possible when describing symptoms</li>
              <li>Include duration and severity of symptoms</li>
              <li>Mention any relevant medical history</li>
              <li>This tool does not replace professional medical advice</li>
            </ul>
          </div>

          <div className="info-card">
            <h3>Emergency Notice</h3>
            <p className="emergency-text">
              If you're experiencing a medical emergency, call 911 or go to 
              the nearest emergency room immediately. Do not wait for an assessment.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PatientHome
