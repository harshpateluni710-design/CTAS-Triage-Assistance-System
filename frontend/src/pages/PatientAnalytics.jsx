import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FaArrowLeft, FaChartLine, FaHeart, FaCalendarCheck, FaExclamationTriangle } from 'react-icons/fa'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { getPatientAnalytics } from '../services/api'
import './PatientAnalytics.css'

const PatientAnalytics = () => {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const data = await getPatientAnalytics()
        setAnalytics(data)
      } catch (err) {
        console.error('Failed to load analytics:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [])

  const totalAssessments = analytics?.totalAssessments || 0
  const monthlyTrend = analytics?.monthlyTrend || []
  const tierDistribution = analytics?.tierDistribution || []
  const topSymptoms = analytics?.topSymptoms || []

  return (
    <div className="patient-analytics-page">
      <div className="page-header">
        <div className="container">
          <Link to="/patient" className="back-button">
            <FaArrowLeft /> Back to Home
          </Link>
          <h1>Health Analytics</h1>
          <p>Track your health trends and insights</p>
        </div>
      </div>

      <div className="container analytics-content">
        {loading ? (
          <div className="empty-state"><p>Loading analytics...</p></div>
        ) : (
        <>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--brand-accent)' }}>
              <FaChartLine />
            </div>
            <div className="stat-info">
              <h3>Total Assessments</h3>
              <p className="stat-value">{totalAssessments}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--tier-0-green)' }}>
              <FaHeart />
            </div>
            <div className="stat-info">
              <h3>Top Symptoms</h3>
              <p className="stat-value">{topSymptoms.length}</p>
              <p className="stat-change neutral">unique types</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--tier-1-amber)' }}>
              <FaCalendarCheck />
            </div>
            <div className="stat-info">
              <h3>Months Active</h3>
              <p className="stat-value">{monthlyTrend.length}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--tier-2-red)' }}>
              <FaExclamationTriangle />
            </div>
            <div className="stat-info">
              <h3>Tier Distribution</h3>
              <p className="stat-value">{tierDistribution.length}</p>
              <p className="stat-change neutral">tiers</p>
            </div>
          </div>
        </div>

        <div className="chart-container">
          <h2>Assessment Trends</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="assessments" stroke="#3b82f6" strokeWidth={2} name="Total Assessments" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h2>Triage Level Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={tierDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#3b82f6" name="Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {totalAssessments > 0 && (
        <div className="insights-section">
          <h2>Health Insights</h2>
          <div className="insights-grid">
            {topSymptoms.length > 0 && (
              <div className="insight-card">
                <div className="insight-icon positive">
                  <FaHeart />
                </div>
                <div>
                  <h3>Top Symptoms</h3>
                  <p>Your most reported symptoms are: {topSymptoms.slice(0, 3).map(s => s.name || s).join(', ')}</p>
                </div>
              </div>
            )}

            {tierDistribution.some(t => (t.name || '').toLowerCase().includes('2') || (t.name || '').toLowerCase().includes('immediate')) && (
              <div className="insight-card">
                <div className="insight-icon warning">
                  <FaExclamationTriangle />
                </div>
                <div>
                  <h3>Attention Needed</h3>
                  <p>You have {tierDistribution.find(t => (t.name || '').toLowerCase().includes('2') || (t.name || '').toLowerCase().includes('immediate'))?.value || 0} urgent-level assessments on record. Consider regular check-ups.</p>
                </div>
              </div>
            )}

            {monthlyTrend.length > 0 && (
              <div className="insight-card">
                <div className="insight-icon info">
                  <FaCalendarCheck />
                </div>
                <div>
                  <h3>Activity Summary</h3>
                  <p>You have {totalAssessments} assessment{totalAssessments !== 1 ? 's' : ''} across {monthlyTrend.length} month{monthlyTrend.length !== 1 ? 's' : ''} of activity.</p>
                </div>
              </div>
            )}
          </div>
        </div>
        )}
        </>
        )}
      </div>
    </div>
  )
}

export default PatientAnalytics
