import React from 'react';
import { Home, FileText, Scale, ShieldCheck, Menu } from 'lucide-react';

export const BottomNav = ({
  currentView,
  onNavigate,
  onOpenDrawer
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'applications', label: 'Applications', icon: FileText },
    { id: 'instruments', label: 'Instruments', icon: Scale },
    { id: 'certificates', label: 'Certificates', icon: ShieldCheck },
  ];

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      <div className="mobile-bottom-nav-inner">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`bottom-nav-btn ${isActive ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <div className="bottom-nav-icon-wrap">
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className="bottom-nav-label">{item.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          className="bottom-nav-btn"
          onClick={onOpenDrawer}
          title="Open Menu"
        >
          <div className="bottom-nav-icon-wrap">
            <Menu size={20} strokeWidth={2} />
          </div>
          <span className="bottom-nav-label">More</span>
        </button>
      </div>
    </nav>
  );
};
