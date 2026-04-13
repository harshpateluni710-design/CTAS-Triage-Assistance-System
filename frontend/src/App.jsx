import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import PatientLogin from './pages/PatientLogin'
import DoctorLogin from './pages/DoctorLogin'
import AdminLogin from './pages/AdminLogin'
import PatientRegister from './pages/PatientRegister'
import DoctorRegister from './pages/DoctorRegister'
import AdminRegister from './pages/AdminRegister'
import PatientHome from './pages/PatientHome'
import PatientInterface from './pages/PatientInterface'
import PatientHistory from './pages/PatientHistory'
import PatientAnalytics from './pages/PatientAnalytics'
import PatientProfile from './pages/PatientProfile'
import DoctorDashboard from './pages/DoctorDashboard'
import DoctorProfile from './pages/DoctorProfile'
import AdminDashboard from './pages/AdminDashboard'
import AdminProfile from './pages/AdminProfile'
import './App.css'

function ProtectedRoute({ role, children }) {
  const token = localStorage.getItem('token')
  const userRole = localStorage.getItem('userRole')

  if (!token || userRole !== role) {
    return <Navigate to={`/${role}-login`} replace />
  }

  return children
}

function App() {
  return (
    <Router>
      <div className="app">
        <main className="main-content">
          <Routes>
            {/* Landing & Auth Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/patient-login" element={<PatientLogin />} />
            <Route path="/doctor-login" element={<DoctorLogin />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/patient-register" element={<PatientRegister />} />
            <Route path="/doctor-register" element={<DoctorRegister />} />
            <Route path="/admin-register" element={<AdminRegister />} />
            
            {/* Patient Routes */}
            <Route path="/patient" element={<ProtectedRoute role="patient"><PatientHome /></ProtectedRoute>} />
            <Route path="/patient/assessment" element={<ProtectedRoute role="patient"><PatientInterface /></ProtectedRoute>} />
            <Route path="/patient/assessment/:id" element={<ProtectedRoute role="patient"><PatientInterface /></ProtectedRoute>} />
            <Route path="/patient/history" element={<ProtectedRoute role="patient"><PatientHistory /></ProtectedRoute>} />
            <Route path="/patient/analytics" element={<ProtectedRoute role="patient"><PatientAnalytics /></ProtectedRoute>} />
            <Route path="/patient/profile" element={<ProtectedRoute role="patient"><PatientProfile /></ProtectedRoute>} />
            
            {/* Doctor & Admin Routes */}
            <Route path="/doctor" element={<ProtectedRoute role="doctor"><DoctorDashboard /></ProtectedRoute>} />
            <Route path="/doctor/profile" element={<ProtectedRoute role="doctor"><DoctorProfile /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/profile" element={<ProtectedRoute role="admin"><AdminProfile /></ProtectedRoute>} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
