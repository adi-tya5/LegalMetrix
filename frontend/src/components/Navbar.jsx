import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import { StatusBadge } from './StatusBadge';

export const Navbar = ({ onNavigate }) => {
  const { user, role, logout, switchRole, DEMO_CREDENTIALS } = useAuth();
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
      } catch (err) {
        // silent
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <header>
      {/* Top Demo Role Switcher Bar */}
      <div className="top-role-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontWeight: '700', color: '#CBD5E1', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            SIH26036 Prototype Demo Role Switcher:
          </span>
          <div className="top-role-buttons">
            <button
              className={`role-switch-btn ${role === 'USER' ? 'active' : ''}`}
              onClick={() => switchRole('USER')}
              title="Switch to Instrument Owner (Rajesh Kumar)"
            >
              👤 Owner (User)
            </button>
            <button
              className={`role-switch-btn ${role === 'LMO' ? 'active' : ''}`}
              onClick={() => switchRole('LMO')}
              title="Switch to Legal Metrology Officer (Inspector Vijay)"
            >
              ⚖️ LMO Officer
            </button>
            <button
              className={`role-switch-btn ${role === 'GATC' ? 'active' : ''}`}
              onClick={() => switchRole('GATC')}
              title="Switch to Government Approved Test Centre (Anil Verma)"
            >
              🔬 GATC (Govt Approved Test Centre)
            </button>
            <button
              className={`role-switch-btn ${role === 'ADMIN' ? 'active' : ''}`}
              onClick={() => switchRole('ADMIN')}
              title="Switch to Controller / Admin (Sunil Deshmukh)"
            >
              🛡️ Administrator
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.78rem' }}>
          <span style={{ color: '#94A3B8' }}>SIH 2026 Category: Software</span>
          <span style={{ color: '#38BDF8', fontWeight: '600' }}>● System Operational</span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <nav className="navbar">
        <div className="brand-container" style={{ cursor: 'pointer' }} onClick={() => onNavigate('dashboard')}>
          <div className="brand-logo">LM</div>
          <div className="brand-text">
            <h1>LegalMetrix</h1>
            <p>Unified Digital Verification &amp; Certification Platform</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => onNavigate('notifications')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.65rem',
                  position: 'relative'
                }}
                title="Notifications & Alerts"
              >
                <span style={{ fontSize: '1rem' }}>🔔</span>
                {unreadCount > 0 ? (
                  <span
                    style={{
                      background: '#EF4444',
                      color: '#FFFFFF',
                      fontSize: '0.7rem',
                      fontWeight: '800',
                      borderRadius: '9999px',
                      padding: '0.1rem 0.4rem',
                      lineHeight: '1.2'
                    }}
                  >
                    {unreadCount}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>0</span>
                )}
              </button>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#0F2537' }}>
                  {user.full_name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                  {user.organization || user.role}
                </div>
              </div>

              <StatusBadge status={user.role} />

              <button
                className="btn btn-outline btn-sm"
                onClick={logout}
                style={{ marginLeft: '0.25rem' }}
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onNavigate('login')}
            >
              Officer / User Login
            </button>
          )}
        </div>
      </nav>
    </header>
  );
};
