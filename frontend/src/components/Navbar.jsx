import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import { StatusBadge } from './StatusBadge';
import {
  Menu,
  Bell,
  LogOut,
  User,
  Shield,
  Scale,
  FlaskConical,
  CheckCircle,
  ExternalLink
} from 'lucide-react';

export const Navbar = ({ onNavigate, onToggleMobileNav, mobileNavOpen }) => {
  const { user, role, logout, switchRole } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    const fetchUnread = async () => {
      try {
        const notifs = await apiRequest('/notifications/?unread_only=true');
        setUnreadCount(notifs ? notifs.length : 0);
      } catch {
        // silent
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <header className="site-header">
      {/* Top Demo Role Switcher Bar */}
      <div className="top-role-bar">
        <div className="top-role-inner">
          <div className="role-switcher-title-wrap">
            <span className="prototype-badge">SIH26036</span>
            <span className="role-switcher-caption">Demo Role Switcher:</span>
          </div>

          <div className="top-role-buttons">
            <button
              type="button"
              className={`role-switch-btn ${role === 'USER' ? 'active' : ''}`}
              onClick={() => switchRole('USER')}
              title="Instrument Owner (Rajesh Kumar)"
            >
              <User size={13} />
              <span>Owner</span>
            </button>
            <button
              type="button"
              className={`role-switch-btn ${role === 'LMO' ? 'active' : ''}`}
              onClick={() => switchRole('LMO')}
              title="Legal Metrology Officer (Inspector Vijay)"
            >
              <Scale size={13} />
              <span>LMO Officer</span>
            </button>
            <button
              type="button"
              className={`role-switch-btn ${role === 'GATC' ? 'active' : ''}`}
              onClick={() => switchRole('GATC')}
              title="Government Approved Test Centre (Anil Verma)"
            >
              <FlaskConical size={13} />
              <span>GATC Centre</span>
            </button>
            <button
              type="button"
              className={`role-switch-btn ${role === 'ADMIN' ? 'active' : ''}`}
              onClick={() => switchRole('ADMIN')}
              title="Directorate / Controller (Sunil Deshmukh)"
            >
              <Shield size={13} />
              <span>Administrator</span>
            </button>
          </div>
        </div>

        <div className="top-role-status">
          <span className="status-indicator-dot" />
          <span>System Operational</span>
        </div>
      </div>

      {/* Main Navbar */}
      <nav className="navbar">
        <div className="navbar-brand-section">
          {user && (
            <button
              type="button"
              className="hamburger-btn"
              onClick={onToggleMobileNav}
              aria-label="Toggle Navigation Menu"
              aria-expanded={mobileNavOpen}
            >
              <Menu size={22} />
            </button>
          )}

          <div
            className="brand-container"
            onClick={() => onNavigate('dashboard')}
            role="button"
            tabIndex={0}
          >
            <div className="brand-logo">LM</div>
            <div className="brand-text">
              <h1 className="brand-heading">LegalMetrix</h1>
              <p className="brand-subheading">National Legal Metrology Portal</p>
            </div>
          </div>
        </div>

        <div className="navbar-actions-section">
          {user ? (
            <div className="navbar-user-cluster">
              {/* Notifications bell */}
              <button
                type="button"
                className="navbar-icon-btn"
                onClick={() => onNavigate('notifications')}
                title="Notifications & Alerts"
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="nav-notif-badge">{unreadCount}</span>
                )}
              </button>

              {/* User profile summary */}
              <div className="navbar-user-meta">
                <span className="user-name">{user.full_name}</span>
                <span className="user-org">{user.organization || user.role}</span>
              </div>

              <div className="navbar-role-badge">
                <StatusBadge status={user.role} size="small" />
              </div>

              {/* Logout button */}
              <button
                type="button"
                className="btn btn-outline btn-sm logout-btn"
                onClick={logout}
                title="Sign out of LegalMetrix"
              >
                <LogOut size={14} />
                <span className="logout-text">Logout</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onNavigate('login')}
            >
              Portal Login
            </button>
          )}
        </div>
      </nav>
    </header>
  );
};
