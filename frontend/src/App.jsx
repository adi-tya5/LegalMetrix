import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { UserDashboard } from './pages/UserDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { LmoDashboard } from './pages/LmoDashboard';
import { InstrumentDetail } from './pages/InstrumentDetail';
import { RegisterInstrument } from './pages/RegisterInstrument';
import { ApplyVerification } from './pages/ApplyVerification';
import { MockPayment } from './pages/MockPayment';
import { AllocationManagement } from './pages/AllocationManagement';
import { FieldVerification } from './pages/FieldVerification';
import { CertificateDetail } from './pages/CertificateDetail';
import { PublicVerify } from './pages/PublicVerify';
import { PublicQrScanner } from './pages/PublicQrScanner';
import { RulesManagement } from './pages/RulesManagement';
import { FeesManagement } from './pages/FeesManagement';
import { AuditLogs } from './pages/AuditLogs';
import { Reports } from './pages/Reports';
import { NotificationsPage } from './pages/NotificationsPage';

export default function App() {
  const { user, role, isAuthenticated, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [targetId, setTargetId] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Check URL pathname for direct public QR scan (e.g. /verify/CERT-MH-001-0001) or /scanner
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/verify/')) {
      const certNo = path.replace('/verify/', '');
      setCurrentView('public-verify');
      setTargetId(certNo);
      setMobileNavOpen(false);
    } else if (path === '/scanner' || path.startsWith('/scanner')) {
      setCurrentView('public-scanner');
      setMobileNavOpen(false);
    }
  }, []);

  const navigate = (view, id = null) => {
    setCurrentView(view);
    setTargetId(id);
    setMobileNavOpen(false);
    window.scrollTo(0, 0);
  };

  // If public scanner is active, render directly without requiring authentication
  if (currentView === 'public-scanner') {
    return (
      <div className="app-container">
        <Navbar onNavigate={navigate} onToggleMobileNav={() => setMobileNavOpen(!mobileNavOpen)} mobileNavOpen={mobileNavOpen} />
        <PublicQrScanner onNavigate={navigate} />
      </div>
    );
  }

  // If public verify is active, render directly without requiring authentication
  if (currentView === 'public-verify') {
    return (
      <div className="app-container">
        <Navbar onNavigate={navigate} onToggleMobileNav={() => setMobileNavOpen(!mobileNavOpen)} mobileNavOpen={mobileNavOpen} />
        <PublicVerify certificateId={targetId || 'CERT-MH-001-0001'} onNavigate={navigate} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="brand-logo" style={{ margin: '0 auto 1rem auto' }}>LM</div>
          <div style={{ fontWeight: '700', color: '#0F2537' }}>Loading LegalMetrix Platform...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="app-container">
        <Navbar onNavigate={navigate} />
        <Login onLoginSuccess={() => navigate('dashboard')} />
      </div>
    );
  }

  const renderRoleDashboard = () => {
    switch (role) {
      case 'ADMIN':
        return <AdminDashboard onNavigate={navigate} />;
      case 'LMO':
        return <LmoDashboard onNavigate={navigate} isGatc={false} />;
      case 'GATC':
        return <LmoDashboard onNavigate={navigate} isGatc={true} />;
      case 'USER':
      default:
        return <UserDashboard onNavigate={navigate} />;
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return renderRoleDashboard();

      case 'instruments':
        return role === 'ADMIN' ? <Reports onNavigate={navigate} /> : <UserDashboard onNavigate={navigate} />;

      case 'instrument-detail':
        return <InstrumentDetail instrumentId={targetId} onNavigate={navigate} />;

      case 'register-instrument':
        return <RegisterInstrument onNavigate={navigate} />;

      case 'apply-verification':
        return <ApplyVerification onNavigate={navigate} />;

      case 'mock-payment':
        return <MockPayment applicationId={targetId} onNavigate={navigate} />;

      case 'allocation':
        return <AllocationManagement selectedAppId={targetId} onNavigate={navigate} />;

      case 'field-verification':
        return <FieldVerification verificationId={targetId} onNavigate={navigate} />;

      case 'certificate-detail':
        return <CertificateDetail certificateId={targetId} onNavigate={navigate} />;

      case 'rules':
        return <RulesManagement onNavigate={navigate} />;

      case 'fees':
        return <FeesManagement onNavigate={navigate} />;

      case 'audit':
        return <AuditLogs onNavigate={navigate} />;

      case 'reports':
        return <Reports onNavigate={navigate} />;

      case 'notifications':
        return <NotificationsPage onNavigate={navigate} />;

      case 'public-scanner':
        return <PublicQrScanner onNavigate={navigate} />;

      case 'public-verify':
        return <PublicVerify certificateId={targetId || 'CERT-MH-001-0001'} onNavigate={navigate} />;

      default:
        return renderRoleDashboard();
    }
  };

  return (
    <div className="app-container">
      <Navbar
        onNavigate={navigate}
        onToggleMobileNav={() => setMobileNavOpen(prev => !prev)}
        mobileNavOpen={mobileNavOpen}
      />
      <div className="main-content">
        <Sidebar
          currentView={currentView}
          onViewChange={navigate}
          mobileNavOpen={mobileNavOpen}
          onCloseMobileNav={() => setMobileNavOpen(false)}
        />
        <main className="content-area">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
