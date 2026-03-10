import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
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
            <Route path="/patient" element={<PatientHome />} />
            <Route path="/patient/assessment" element={<PatientInterface />} />
            <Route path="/patient/history" element={<PatientHistory />} />
            <Route path="/patient/analytics" element={<PatientAnalytics />} />
            <Route path="/patient/profile" element={<PatientProfile />} />
            
            {/* Doctor & Admin Routes */}
            <Route path="/doctor" element={<DoctorDashboard />} />
            <Route path="/doctor/profile" element={<DoctorProfile />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/profile" element={<AdminProfile />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
