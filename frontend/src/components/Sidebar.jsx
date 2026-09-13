import React from 'react';
import { useAuth } from '../context/AuthContext';

export const Sidebar = ({ currentView, onViewChange, mobileNavOpen, onCloseMobileNav }) => {
  const { role } = useAuth();

  const getLinks = () => {
    switch (role) {
      case 'ADMIN':
        return [
          { id: 'dashboard', label: 'Admin Overview', icon: '📊' },
          { id: 'instruments', label: 'All Instruments', icon: '⚖️' },
          { id: 'allocation', label: 'Verifier Allocation', icon: '👥' },
          { id: 'rules', label: 'Rules Engine', icon: '⚙️' },
          { id: 'fees', label: 'Fee Engine', icon: '💳' },
          { id: 'audit', label: 'Audit Trail', icon: '📜' },
          { id: 'reports', label: 'Reports & Export', icon: '📈' },
          { id: 'notifications', label: 'System Alerts', icon: '🔔' },
        ];
      case 'LMO':
        return [
          { id: 'dashboard', label: 'LMO Docket', icon: '📋' },
          { id: 'field-verification', label: 'Field Verification', icon: '📱' },
          { id: 'instruments', label: 'Assigned Instruments', icon: '⚖️' },
          { id: 'notifications', label: 'Notifications & Alerts', icon: '🔔' },
          { id: 'audit', label: 'Activity Logs', icon: '📜' },
        ];
      case 'GATC':
        return [
          { id: 'dashboard', label: 'GATC Test Docket', icon: '🔬' },
          { id: 'field-verification', label: 'GATC Verification Docket', icon: '🧪' },
          { id: 'instruments', label: 'Tested Instruments', icon: '⚖️' },
          { id: 'notifications', label: 'Notifications & Alerts', icon: '🔔' },
          { id: 'audit', label: 'Activity Logs', icon: '📜' },
        ];
      case 'USER':
      default:
        return [
          { id: 'dashboard', label: 'My Instruments & Certs', icon: '📊' },
          { id: 'register-instrument', label: 'Register Instrument', icon: '➕' },
          { id: 'apply-verification', label: 'Apply for Verification', icon: '📝' },
          { id: 'notifications', label: 'Notifications & Alerts', icon: '🔔' },
        ];
    }
  };

  const links = getLinks();

  const handleLinkClick = (id, param = null) => {
    onViewChange(id, param);
    if (onCloseMobileNav) {
      onCloseMobileNav();
    }
  };

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      <div
        className={`sidebar-overlay ${mobileNavOpen ? 'active' : ''}`}
        onClick={onCloseMobileNav}
        aria-hidden="true"
      />

      <aside className={`sidebar ${mobileNavOpen ? 'mobile-open' : ''}`}>
        <div style={{ padding: '1.25rem 1rem 0.75rem 1rem', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {role || 'USER'} PORTAL
          </div>
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onCloseMobileNav}
            aria-label="Close navigation"
            title="Close menu"
          >
            ✕
          </button>
        </div>
        <nav className="sidebar-nav">
          {links.map((link) => (
            <div
              key={link.id}
              className={`sidebar-link ${currentView === link.id ? 'active' : ''}`}
              onClick={() => handleLinkClick(link.id)}
            >
              <span style={{ fontSize: '1.1rem' }}>{link.icon}</span>
              <span>{link.label}</span>
            </div>
          ))}
        </nav>

        {/* Public QR quick test helper */}
        <div style={{ marginTop: 'auto', padding: '1rem', borderTop: '1px solid #F1F5F9', background: '#F8FAFC' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: '700', color: '#64748B', marginBottom: '0.35rem' }}>
            PUBLIC QR VERIFY
          </div>
          <button
            className="btn btn-outline btn-sm"
            style={{ width: '100%', fontSize: '0.75rem', background: '#FFFFFF' }}
            onClick={() => handleLinkClick('public-verify', 'CERT-MH-001-0001')}
          >
            🔍 View Public /verify
          </button>
        </div>
      </aside>
    </>
  );
};
