import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaChartLine, FaDatabase, FaExclamationTriangle, FaUpload, FaTrash, FaSignOutAlt, FaUserCircle, FaSearch, FaExternalLinkAlt, FaTimesCircle } from 'react-icons/fa'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { getSystemMetrics, getBiasAudit, uploadProtocol, deleteProtocol, getKnowledgeBase, getAdminProtocol } from '../services/api'
import './AdminDashboard.css'

const LARGE_TEXT_PARSE_THRESHOLD_BYTES = 1024 * 1024

const AdminDashboard = () => {
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState(null)
  const [biasData, setBiasData] = useState(null)
  const [knowledgeBase, setKnowledgeBase] = useState([])
  const [activeTab, setActiveTab] = useState('health')
  const [loading, setLoading] = useState(true)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadForm, setUploadForm] = useState({
    title: '',
    type: '',
    description: '',
    criteria: '',
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProtocol, setSelectedProtocol] = useState(null)
  const [isProtocolLoading, setIsProtocolLoading] = useState(false)
  const [protocolError, setProtocolError] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('user')
    navigate('/')
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const [metricsData, biasAuditData, kbData] = await Promise.all([
        getSystemMetrics(),
        getBiasAudit(),
        getKnowledgeBase()
      ])
      setMetrics(metricsData)
      setBiasData(biasAuditData)
      setKnowledgeBase(kbData)
    } catch (error) {
      console.error('Error loading admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()

    if (!uploadFile && !uploadForm.title.trim()) {
      alert('Select a file or provide at least a title.')
      return
    }

    const criteriaList = uploadForm.criteria
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean)

    try {
      setIsUploading(true)
      await uploadProtocol({
        file: uploadFile,
        title: uploadForm.title,
        type: uploadForm.type,
        description: uploadForm.description,
        criteria: criteriaList,
      })
      setUploadFile(null)
      setUploadForm({ title: '', type: '', description: '', criteria: '' })
      await loadData()
      alert('Protocol uploaded successfully')
    } catch (error) {
      console.error('Error uploading protocol:', error)
      alert('Failed to upload protocol')
    } finally {
      setIsUploading(false)
    }
  }

  const handleOpenProtocol = async (protocolId) => {
    try {
      setProtocolError('')
      setIsProtocolLoading(true)
      const protocol = await getAdminProtocol(protocolId)
      setSelectedProtocol(protocol)
    } catch (error) {
      console.error('Error opening protocol:', error)
      setProtocolError('Unable to open protocol details right now.')
    } finally {
      setIsProtocolLoading(false)
    }
  }

  const handleDelete = async (protocolId) => {
    if (!confirm('Are you sure you want to delete this protocol?')) return

    try {
      await deleteProtocol(protocolId)
      await loadData()
      alert('Protocol deleted successfully')
    } catch (error) {
      console.error('Error deleting protocol:', error)
      alert('Failed to delete protocol')
    }
  }

  const filteredKnowledgeBase = knowledgeBase.filter((protocol) => {
    const lower = searchTerm.toLowerCase()
    return (
      String(protocol.title || '').toLowerCase().includes(lower) ||
      String(protocol.description || '').toLowerCase().includes(lower) ||
      String(protocol.type || '').toLowerCase().includes(lower)
    )
  })

  const isLargeTextFileSelected = Boolean(
    uploadFile &&
    /\.(txt|md|csv)$/i.test(uploadFile.name || '') &&
    Number(uploadFile.size || 0) > LARGE_TEXT_PARSE_THRESHOLD_BYTES
  )

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" aria-label="Loading"></div>
      </div>
    )
  }

  return (
    <div className="admin-dashboard" id="main-content">
      <div className="container">
        <div className="dashboard-header">
          <div>
            <h1>System Administration Dashboard</h1>
            <p className="dashboard-intro">
              Monitor system performance, manage clinical protocols, and audit for bias.
            </p>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            <FaSignOutAlt /> Logout
          </button>
          <button onClick={() => navigate('/admin/profile')} className="logout-btn" style={{background:'var(--brand-accent)'}}>
            <FaUserCircle /> Profile
          </button>
        </div>

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'health' ? 'active' : ''}`}
            onClick={() => setActiveTab('health')}
            aria-selected={activeTab === 'health'}
            role="tab"
          >
            System Health
          </button>
          <button
            className={`tab ${activeTab === 'knowledge' ? 'active' : ''}`}
            onClick={() => setActiveTab('knowledge')}
            aria-selected={activeTab === 'knowledge'}
            role="tab"
          >
            Knowledge Base
          </button>
          <button
            className={`tab ${activeTab === 'bias' ? 'active' : ''}`}
            onClick={() => setActiveTab('bias')}
            aria-selected={activeTab === 'bias'}
            role="tab"
          >
            Bias Audit
          </button>
        </div>

        {activeTab === 'health' && metrics && (
          <section className="health-section" aria-labelledby="health-heading">
            <h2 id="health-heading" className="sr-only">System Health Monitoring</h2>
            
            <div className="metrics-grid">
              <MetricCard
                title="Total Assessments"
                value={metrics.totalAssessments}
                status="info"
              />
              <MetricCard
                title="Total Patients"
                value={metrics.totalPatients}
                status="info"
              />
              <MetricCard
                title="Total Doctors"
                value={metrics.totalDoctors}
                status="info"
              />
              <MetricCard
                title="Validation Accuracy"
                value={`${metrics.accuracy}%`}
                status={metrics.accuracy >= 85 ? 'good' : metrics.accuracy >= 60 ? 'warning' : 'critical'}
                target="Target: >=85%"
              />
            </div>

            {metrics.dailyTrend && metrics.dailyTrend.length > 0 && (
            <div className="card">
              <h3>Assessment Trend (Last 7 Days)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="assessments"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Assessments"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            )}

            {metrics.tierDistribution && metrics.tierDistribution.length > 0 && (
            <div className="card">
              <h3>Triage Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.tierDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#3b82f6" name="Number of Cases" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            )}
          </section>
        )}

        {activeTab === 'knowledge' && (
          <section className="knowledge-section" aria-labelledby="knowledge-heading">
            <h2 id="knowledge-heading" className="sr-only">Knowledge Base Management</h2>
            
            <div className="card upload-section">
              <h3>
                <FaUpload aria-hidden="true" />
                Upload New Protocol
              </h3>
              <form onSubmit={handleUpload} className="upload-form">
                <input
                  type="file"
                  accept=".json,.txt,.md,.csv,.pdf"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="file-input"
                  id="protocol-file"
                  aria-label="Select protocol file"
                />
                <label htmlFor="protocol-file" className="file-label">
                  {uploadFile ? uploadFile.name : 'Choose file...'}
                </label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="upload-input"
                  placeholder="Protocol title (optional if file selected)"
                />
                <input
                  type="text"
                  value={uploadForm.type}
                  onChange={(e) => setUploadForm((prev) => ({ ...prev, type: e.target.value }))}
                  className="upload-input"
                  placeholder="Type (e.g., ESI, Cardiac)"
                />
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="upload-input upload-textarea"
                  placeholder="Description"
                />
                <textarea
                  value={uploadForm.criteria}
                  onChange={(e) => setUploadForm((prev) => ({ ...prev, criteria: e.target.value }))}
                  className="upload-input upload-textarea"
                  placeholder="Criteria (comma or new line separated)"
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isUploading || (!uploadFile && !uploadForm.title.trim())}
                >
                  {isUploading ? 'Processing...' : 'Upload Protocol'}
                </button>
              </form>

              {isUploading && (
                <p className="upload-notice upload-notice-info" role="status">
                  Processing file upload. Large files can take up to 3 minutes on live servers.
                </p>
              )}

              {!isUploading && isLargeTextFileSelected && (
                <p className="upload-notice upload-notice-warning">
                  Large text file detected. The system parses the first 1 MB preview for faster response.
                </p>
              )}
            </div>

            <div className="search-bar">
              <FaSearch aria-hidden="true" />
              <input
                type="search"
                placeholder="Search protocols by title, type, or description"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search protocol library"
              />
            </div>

            <div className="protocols-table card">
              <h3>Current Protocols ({filteredKnowledgeBase.length})</h3>
              {filteredKnowledgeBase.length === 0 ? (
                <p className="empty-state">No protocols in knowledge base.</p>
              ) : (
                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Type</th>
                        <th>Last Updated</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredKnowledgeBase.map((protocol) => (
                        <tr key={protocol.id}>
                          <td>{protocol.id}</td>
                          <td>{protocol.title}</td>
                          <td>
                            <span className="badge">{protocol.type}</span>
                          </td>
                          <td>{new Date(protocol.lastUpdated).toLocaleDateString()}</td>
                          <td>
                            <span className={`status-badge ${protocol.active ? 'active' : 'inactive'}`}>
                              {protocol.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn-icon btn-info"
                              onClick={() => handleOpenProtocol(protocol.id)}
                              aria-label={`Open ${protocol.title}`}
                            >
                              <FaExternalLinkAlt />
                            </button>
                            <button
                              className="btn-icon btn-danger"
                              onClick={() => handleDelete(protocol.id)}
                              aria-label={`Delete ${protocol.title}`}
                            >
                              <FaTrash />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {protocolError && <p className="empty-state">{protocolError}</p>}

            {isProtocolLoading && <p className="empty-state">Loading protocol...</p>}

            {selectedProtocol && (
              <div className="protocol-modal-backdrop" role="dialog" aria-modal="true" aria-label="Protocol details">
                <div className="protocol-modal card">
                  <div className="protocol-modal-header">
                    <h3>{selectedProtocol.title}</h3>
                    <button type="button" className="btn-icon" onClick={() => setSelectedProtocol(null)} aria-label="Close protocol">
                      <FaTimesCircle aria-hidden="true" />
                    </button>
                  </div>

                  <p><strong>Type:</strong> {selectedProtocol.type || 'N/A'}</p>
                  <p><strong>Description:</strong> {selectedProtocol.description || 'N/A'}</p>
                  <p><strong>Status:</strong> {selectedProtocol.active ? 'Active' : 'Inactive'}</p>
                  <p><strong>Updated:</strong> {new Date(selectedProtocol.lastUpdated).toLocaleString()}</p>

                  <div className="protocol-criteria-list">
                    <strong>Criteria</strong>
                    {Array.isArray(selectedProtocol.criteria) && selectedProtocol.criteria.length > 0 ? (
                      <ul>
                        {selectedProtocol.criteria.map((criterion, idx) => (
                          <li key={idx}>{criterion}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>No criteria listed.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'bias' && biasData && (
          <section className="bias-section" aria-labelledby="bias-heading">
            <h2 id="bias-heading" className="sr-only">Bias Assessment Audit</h2>
            
            <div className="alert-warning">
              <FaExclamationTriangle aria-hidden="true" />
              <div>
                <strong>Bias Monitoring Active</strong>
                <p>
                  System performance is continuously monitored across triage tiers
                  and confidence levels to ensure fairness and equity in recommendations.
                </p>
              </div>
            </div>

            {biasData.tierDistribution && biasData.tierDistribution.length > 0 && (
            <div className="card">
              <h3>Tier Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={biasData.tierDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#3b82f6" name="Assessments" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            )}

            {biasData.confidenceDistribution && biasData.confidenceDistribution.length > 0 && (
            <div className="card">
              <h3>Confidence Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={biasData.confidenceDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#10b981" name="Assessments" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            )}

            {biasData.tierAccuracy && biasData.tierAccuracy.length > 0 && (
            <div className="bias-metrics-grid">
              {biasData.tierAccuracy.map((tier) => (
                <div key={tier.tier} className="card bias-card">
                  <h4>Tier {tier.tier}</h4>
                  <div className="bias-stats">
                    <div className="bias-stat">
                      <span className="stat-label">Accuracy:</span>
                      <span className="stat-value">{tier.accuracy}%</span>
                    </div>
                    <div className="bias-stat">
                      <span className="stat-label">Validated Cases:</span>
                      <span className="stat-value">{tier.validated}</span>
                    </div>
                  </div>
                  {tier.accuracy < 80 && (
                    <div className="bias-alert">
                      <FaExclamationTriangle />
                      <span>Below target performance</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

const MetricCard = ({ title, value, status, target }) => {
  const getStatusClass = () => {
    switch (status) {
      case 'good': return 'status-good'
      case 'warning': return 'status-warning'
      case 'critical': return 'status-critical'
      default: return 'status-info'
    }
  }

  return (
    <div className={`metric-card card ${getStatusClass()}`}>
      <h3>{title}</h3>
      <div className="metric-value">{value}</div>
      {target && <div className="metric-target">{target}</div>}
    </div>
  )
}

export default AdminDashboard
