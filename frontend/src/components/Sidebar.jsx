import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Scale,
  FileText,
  ShieldCheck,
  Bell,
  ClipboardList,
  CheckSquare,
  History,
  FlaskConical,
  UserPlus,
  Calendar,
  Sliders,
  CreditCard,
  FileSpreadsheet,
  BarChart3,
  QrCode,
  X,
  Shield,
  User,
  ExternalLink
} from 'lucide-react';

export const Sidebar = ({ currentView, onViewChange, mobileNavOpen, onCloseMobileNav }) => {
  const { role, user } = useAuth();

  const getLinks = () => {
    switch (role) {
      case 'ADMIN':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'applications', label: 'Applications', icon: FileText },
          { id: 'allocation', label: 'Allocation', icon: UserPlus },
          { id: 'scheduling', label: 'Scheduling', icon: Calendar },
          { id: 'rules', label: 'Rules', icon: Sliders },
          { id: 'fees', label: 'Fees', icon: CreditCard },
          { id: 'audit', label: 'Audit Logs', icon: FileSpreadsheet },
          { id: 'reports', label: 'Reports', icon: BarChart3 },
        ];

      case 'LMO':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'allocation', label: 'Assigned Verifications', icon: ClipboardList },
          { id: 'field-verification', label: 'Field Verification', icon: CheckSquare },
          { id: 'reports', label: 'Verification History', icon: History },
          { id: 'certificates', label: 'Certificates', icon: ShieldCheck },
          { id: 'notifications', label: 'Notifications', icon: Bell },
        ];

      case 'GATC':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'field-verification', label: 'GATC Verification Docket', icon: FlaskConical },
          { id: 'reports', label: 'Verification History', icon: History },
          { id: 'certificates', label: 'Certificates', icon: ShieldCheck },
          { id: 'notifications', label: 'Notifications', icon: Bell },
        ];

      case 'USER':
      default:
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'instruments', label: 'My Instruments', icon: Scale },
          { id: 'applications', label: 'Applications', icon: FileText },
          { id: 'certificates', label: 'Certificates', icon: ShieldCheck },
          { id: 'notifications', label: 'Notifications', icon: Bell },
        ];
    }
  };

  const links = getLinks();

  const handleLinkClick = (id) => {
    onViewChange(id);
    if (onCloseMobileNav) {
      onCloseMobileNav();
    }
  };

  const getRoleLabel = () => {
    switch (role) {
      case 'ADMIN': return 'ADMINISTRATOR';
      case 'LMO': return 'LEGAL METROLOGY OFFICER';
      case 'GATC': return 'GATC TEST CENTRE';
      case 'USER':
      default: return 'INSTRUMENT OWNER';
    }
  };

  return (
    <>
      {/* Mobile Drawer Backdrop Overlay */}
      <div
        className={`sidebar-overlay ${mobileNavOpen ? 'active' : ''}`}
        onClick={onCloseMobileNav}
        aria-hidden="true"
      />

      <aside className={`sidebar ${mobileNavOpen ? 'mobile-open' : ''}`}>
        {/* Drawer Header (Mobile & Desktop) */}
        <div className="sidebar-header">
          <div className="sidebar-role-indicator">
            <span className="role-tag-dot" />
            <span className="role-tag-text">{getRoleLabel()}</span>
          </div>

          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onCloseMobileNav}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Link Items */}
        <nav className="sidebar-nav">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = currentView === link.id;

            return (
              <button
                key={link.id}
                type="button"
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                onClick={() => handleLinkClick(link.id)}
              >
                <div className="sidebar-link-icon">
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className="sidebar-link-text">{link.label}</span>
                {isActive && <div className="active-pill-bar" />}
              </button>
            );
          })}
        </nav>

        {/* Public QR Scanner Shortcut Card at bottom of sidebar */}
        <div className="sidebar-footer">
          <div className="sidebar-footer-card">
            <div className="footer-card-header">
              <QrCode size={16} className="text-teal" />
              <span className="footer-card-title">PUBLIC QR VERIFIER</span>
            </div>
            <p className="footer-card-sub">
              Scan or enter certificate ID to verify statutory validity.
            </p>
            <button
              type="button"
              className="btn btn-navy btn-sm btn-block"
              onClick={() => handleLinkClick('public-scanner')}
            >
              Verify Certificate
              <ExternalLink size={12} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
