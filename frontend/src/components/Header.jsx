import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FaUserInjured, FaUserMd, FaUserShield } from 'react-icons/fa'
import './Header.css'

const Header = () => {
  const location = useLocation()

  return (
    <header className="header" role="banner">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <div className="container">
        <div className="header-content">
          <div className="logo">
            <h1>CTAS</h1>
            <span className="subtitle">Triage Assistance System</span>
          </div>
          <nav className="nav" role="navigation" aria-label="Main navigation">
            <Link
              to="/patient"
              className={`nav-link ${location.pathname === '/patient' ? 'active' : ''}`}
              aria-current={location.pathname === '/patient' ? 'page' : undefined}
            >
              <FaUserInjured aria-hidden="true" />
              <span>Patient</span>
            </Link>
            <Link
              to="/doctor"
              className={`nav-link ${location.pathname === '/doctor' ? 'active' : ''}`}
              aria-current={location.pathname === '/doctor' ? 'page' : undefined}
            >
              <FaUserMd aria-hidden="true" />
              <span>Doctor</span>
            </Link>
            <Link
              to="/admin"
              className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}
              aria-current={location.pathname === '/admin' ? 'page' : undefined}
            >
              <FaUserShield aria-hidden="true" />
              <span>Admin</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}

export default Header
