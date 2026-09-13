import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { DemoDisclaimer } from '../components/DemoDisclaimer';
import { ApplicationTrackingCard, getNextActionInfo } from '../components/ApplicationTrackingCard';
import { ResponsiveTable } from '../components/ResponsiveTable';
import { SkeletonStats, SkeletonTable } from '../components/SkeletonLoader';
import {
  Scale,
  FileText,
  ShieldCheck,
  Bell,
  PlusCircle,
  ClipboardCheck,
  ArrowRight,
  ExternalLink,
  RotateCcw,
  Calendar,
  AlertTriangle,
  Sparkles,
  Search
} from 'lucide-react';

export const UserDashboard = ({ onNavigate, initialTab = 'dashboard' }) => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [instruments, setInstruments] = useState([]);
  const [applications, setApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'instruments' | 'applications' | 'certificates'

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, inst, apps, notifs] = await Promise.all([
        apiRequest('/reports/metrics'),
        apiRequest('/instruments/'),
        apiRequest('/applications/'),
        apiRequest('/notifications/')
      ]);
      setMetrics(m);
      setInstruments(inst || []);
      setApplications(apps || []);
      setNotifications(notifs || []);
      if (apps && apps.length > 0 && !selectedAppId) {
        setSelectedAppId(apps[0].id);
      }
    } catch (err) {
      console.error(err);
      setError('Unable to load dashboard data right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStartReverification = async (instrumentId) => {
    try {
      const res = await apiRequest('/reverification/start', {
        method: 'POST',
        body: JSON.stringify({
          instrument_id: instrumentId,
          notes: 'Initiating re-verification via user dashboard'
        })
      });
      alert(`Re-Verification application ${res.application_number} created successfully! State: SUBMITTED`);
      loadData();
    } catch (err) {
      alert(`Failed to start re-verification: ${err.message}`);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div style={{ marginBottom: '1.5rem' }}>
          <div className="skeleton-pulse" style={{ width: '250px', height: '32px', marginBottom: '0.5rem', borderRadius: '6px' }} />
          <div className="skeleton-pulse" style={{ width: '400px', height: '18px', borderRadius: '6px' }} />
        </div>
        <SkeletonStats />
        <SkeletonTable rows={3} cols={4} />
      </div>
    );
  }

  // Find all active/recent certificates across instruments
  const certificatesList = instruments
    .filter(i => i.latest_certificate)
    .map(i => ({
      ...i.latest_certificate,
      instrument_uid: i.instrument_uid,
      instrument_type: i.instrument_type,
      instrument_id: i.id
    }));

  return (
    <div className="dashboard-container">
      {/* 1. Header Greeting & Primary CTAs */}
      <div className="page-header-block">
        <div className="page-title-wrap">
          <div className="user-greeting-badge">
            <Sparkles size={14} className="text-teal" />
            <span>{getGreeting()}, {user?.full_name || 'Instrument Owner'}</span>
          </div>
          <h1 className="page-main-title">Owner Dashboard</h1>
          <p className="page-sub-title">
            Track verification progress, manage registered metrological instruments, and access digital certificates.
          </p>
        </div>

        <div className="page-actions-group">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => onNavigate('register-instrument')}
          >
            <PlusCircle size={16} />
            <span>Register Instrument</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onNavigate('apply-verification')}
          >
            <ClipboardCheck size={16} />
            <span>Apply for Verification</span>
          </button>
        </div>
      </div>

      <DemoDisclaimer />

      {error && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button className="btn btn-outline btn-sm" onClick={loadData}>Retry</button>
        </div>
      )}

      {/* 2. FIRST-CLASS APPLICATION TRACKING CARD */}
      <ApplicationTrackingCard
        applications={applications}
        selectedAppId={selectedAppId}
        onSelectApp={(id) => setSelectedAppId(id)}
        onNavigate={onNavigate}
      />

      {/* 3. COMPACT SUMMARY COUNTERS */}
      <div className="compact-summary-row">
        <div
          className={`summary-pill-card ${activeTab === 'instruments' ? 'active' : ''}`}
          onClick={() => setActiveTab(activeTab === 'instruments' ? 'all' : 'instruments')}
          role="button"
          tabIndex={0}
        >
          <div className="pill-icon-box bg-blue">
            <Scale size={20} />
          </div>
          <div className="pill-content">
            <span className="pill-value">{metrics?.total_instruments || instruments.length}</span>
            <span className="pill-label">Instruments</span>
          </div>
        </div>

        <div
          className={`summary-pill-card ${activeTab === 'applications' ? 'active' : ''}`}
          onClick={() => setActiveTab(activeTab === 'applications' ? 'all' : 'applications')}
          role="button"
          tabIndex={0}
        >
          <div className="pill-icon-box bg-purple">
            <FileText size={20} />
          </div>
          <div className="pill-content">
            <span className="pill-value">{applications.length}</span>
            <span className="pill-label">Applications</span>
          </div>
        </div>

        <div
          className={`summary-pill-card ${activeTab === 'certificates' ? 'active' : ''}`}
          onClick={() => setActiveTab(activeTab === 'certificates' ? 'all' : 'certificates')}
          role="button"
          tabIndex={0}
        >
          <div className="pill-icon-box bg-green">
            <ShieldCheck size={20} />
          </div>
          <div className="pill-content">
            <span className="pill-value">{metrics?.certificates_issued || certificatesList.length}</span>
            <span className="pill-label">Certificates</span>
          </div>
        </div>

        <div
          className="summary-pill-card"
          onClick={() => onNavigate('notifications')}
          role="button"
          tabIndex={0}
        >
          <div className="pill-icon-box bg-amber">
            <Bell size={20} />
          </div>
          <div className="pill-content">
            <span className="pill-value">
              {notifications.filter(n => !n.read_status).length}
            </span>
            <span className="pill-label">Notifications</span>
          </div>
        </div>
      </div>

      {/* 4. RECENT APPLICATIONS CARDS (Quick Visual Cards) */}
      {(activeTab === 'all' || activeTab === 'applications') && (
        <div className="section-card">
          <div className="section-card-header">
            <div>
              <h3 className="section-card-title">Recent Applications</h3>
              <p className="section-card-sub">
                Track status and view required next steps for each verification cycle
              </p>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => onNavigate('apply-verification')}
            >
              + New Application
            </button>
          </div>

          {applications.length === 0 ? (
            <div className="empty-state-box">
              <FileText size={42} className="empty-state-icon" />
              <h4>No Applications Yet</h4>
              <p>
                Register your instrument and submit a verification application to start tracking its verification lifecycle.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onNavigate('register-instrument')}
              >
                Register Instrument
              </button>
            </div>
          ) : (
            <div className="recent-apps-grid">
              {applications.slice(0, 4).map((app) => {
                const nextAction = getNextActionInfo(app);
                const isSelected = selectedAppId === app.id;
                const submittedDate = app.created_at
                  ? new Date(app.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : 'Recent';

                return (
                  <div
                    key={app.id}
                    className={`recent-app-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedAppId(app.id)}
                  >
                    <div className="recent-app-header">
                      <span className="recent-app-id">{app.application_number}</span>
                      <StatusBadge status={app.current_status} size="small" />
                    </div>

                    <div className="recent-app-instrument">
                      <strong>{app.instrument_type || 'Instrument'}</strong>
                      <span className="recent-app-uid">UID: {app.instrument_uid || 'N/A'}</span>
                    </div>

                    <div className="recent-app-date">
                      <Calendar size={13} />
                      <span>Submitted: {submittedDate}</span>
                    </div>

                    {/* Small highlighted NEXT ACTION area */}
                    <div className={`recent-app-next-action tone-${nextAction.tone}`}>
                      <span className="next-action-micro-label">NEXT:</span>
                      <span className="next-action-micro-text">{nextAction.text}</span>
                    </div>

                    <div className="recent-app-footer">
                      <button
                        type="button"
                        className="btn btn-navy btn-sm btn-block"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAppId(app.id);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        Track Application
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Detailed Applications Responsive Table */}
          {applications.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ fontSize: '0.825rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.5px' }}>
                All Verification Applications ({applications.length})
              </div>
              <ResponsiveTable
                columns={[
                  {
                    key: 'application_number',
                    label: 'Application ID',
                    render: (row) => (
                      <span style={{ fontWeight: '700', fontFamily: 'monospace', color: '#0F2537' }}>
                        {row.application_number}
                      </span>
                    )
                  },
                  {
                    key: 'instrument',
                    label: 'Instrument',
                    render: (row) => (
                      <div>
                        <div style={{ fontWeight: '600' }}>{row.instrument_type}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{row.instrument_uid}</div>
                      </div>
                    )
                  },
                  {
                    key: 'current_status',
                    label: 'Status',
                    render: (row) => <StatusBadge status={row.current_status} size="small" />
                  },
                  {
                    key: 'fee_amount',
                    label: 'Fee / Payment',
                    render: (row) => (
                      <div>
                        <strong>₹{row.fee_amount}</strong>
                        <div style={{ fontSize: '0.72rem', color: row.payment_status === 'COMPLETED' ? '#007A64' : '#B45309' }}>
                          {row.payment_status}
                        </div>
                      </div>
                    )
                  },
                  {
                    key: 'next_action',
                    label: 'Next Action',
                    render: (row) => {
                      const na = getNextActionInfo(row);
                      return (
                        <span style={{ fontSize: '0.8rem', color: '#334155', fontWeight: '500' }}>
                          {na.text}
                        </span>
                      );
                    }
                  },
                  {
                    key: 'actions',
                    label: 'Action',
                    isAction: true,
                    render: (row) => (
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => {
                            setSelectedAppId(row.id);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          Track
                        </button>
                        {row.current_status === 'PAYMENT_PENDING' && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => onNavigate('mock-payment', row.id)}
                          >
                            Pay ₹{row.fee_amount}
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => onNavigate('instrument-detail', row.instrument_id)}
                        >
                          Details
                        </button>
                      </div>
                    )
                  }
                ]}
                data={applications}
                renderMobileCard={(row) => {
                  const na = getNextActionInfo(row);
                  return (
                    <div>
                      <div className="mobile-card-header">
                        <div>
                          <span className="mobile-card-title-label">Application</span>
                          <div className="mobile-card-title-val">{row.application_number}</div>
                        </div>
                        <StatusBadge status={row.current_status} size="small" />
                      </div>

                      <div className="mobile-card-row">
                        <span className="mobile-card-label">Instrument</span>
                        <span className="mobile-card-val">
                          <strong>{row.instrument_type}</strong> ({row.instrument_uid})
                        </span>
                      </div>

                      <div className="mobile-card-row">
                        <span className="mobile-card-label">Fee &amp; Payment</span>
                        <span className="mobile-card-val">₹{row.fee_amount} &bull; {row.payment_status}</span>
                      </div>

                      <div className="mobile-card-next-action-box">
                        <span className="next-action-micro-label">NEXT ACTION</span>
                        <p>{na.text}</p>
                      </div>

                      <div className="mobile-card-actions">
                        <button
                          type="button"
                          className="btn btn-navy btn-sm"
                          onClick={() => {
                            setSelectedAppId(row.id);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          Track
                        </button>
                        {row.current_status === 'PAYMENT_PENDING' && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => onNavigate('mock-payment', row.id)}
                          >
                            Pay Fee
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => onNavigate('instrument-detail', row.instrument_id)}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  );
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* 5. REGISTERED INSTRUMENTS SECTION */}
      {(activeTab === 'all' || activeTab === 'instruments') && (
        <div className="section-card">
          <div className="section-card-header">
            <div>
              <h3 className="section-card-title">My Registered Instruments</h3>
              <p className="section-card-sub">
                Permanent registry profile &bull; One instrument connected to complete verification history
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onNavigate('register-instrument')}
            >
              <PlusCircle size={14} />
              <span>Register Instrument</span>
            </button>
          </div>

          {instruments.length === 0 ? (
            <div className="empty-state-box">
              <Scale size={42} className="empty-state-icon" />
              <h4>No Instruments Registered</h4>
              <p>
                Register your weighing and measuring instruments to apply for digital verification and compliance certificates.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onNavigate('register-instrument')}
              >
                Register First Instrument
              </button>
            </div>
          ) : (
            <ResponsiveTable
              columns={[
                {
                  key: 'instrument_uid',
                  label: 'Instrument UID',
                  render: (row) => (
                    <span style={{ fontWeight: '700', fontFamily: 'monospace', color: '#0F2537' }}>
                      {row.instrument_uid}
                    </span>
                  )
                },
                {
                  key: 'type',
                  label: 'Type & Category',
                  render: (row) => (
                    <div>
                      <div style={{ fontWeight: '600' }}>{row.instrument_type}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{row.category}</div>
                    </div>
                  )
                },
                {
                  key: 'serial',
                  label: 'Serial / Model',
                  render: (row) => (
                    <div>
                      <span style={{ fontFamily: 'monospace', fontWeight: '500' }}>{row.serial_number}</span>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{row.manufacturer}</div>
                    </div>
                  )
                },
                {
                  key: 'capacity',
                  label: 'Capacity',
                  render: (row) => `${row.max_capacity} ${row.unit}`
                },
                {
                  key: 'status',
                  label: 'Validity Status',
                  render: (row) => <StatusBadge status={row.current_status} size="small" />
                },
                {
                  key: 'certificate',
                  label: 'Latest Certificate',
                  render: (row) => row.latest_certificate ? (
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.8rem', color: '#007A64', fontFamily: 'monospace' }}>
                        {row.latest_certificate.certificate_number}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                        Valid: {new Date(row.latest_certificate.expiry_date).toLocaleDateString()}
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>None Issued</span>
                  )
                },
                {
                  key: 'actions',
                  label: 'Actions',
                  isAction: true,
                  render: (row) => {
                    const needsRever = ['EXPIRING_SOON', 'EXPIRED', 'RE_VERIFICATION_REQUIRED'].includes(row.current_status);
                    return (
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => onNavigate('instrument-detail', row.id)}
                        >
                          View History
                        </button>
                        {row.latest_certificate && (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => onNavigate('certificate-detail', row.latest_certificate.id)}
                          >
                            Certificate
                          </button>
                        )}
                        {needsRever && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleStartReverification(row.id)}
                          >
                            Re-Verify
                          </button>
                        )}
                      </div>
                    );
                  }
                }
              ]}
              data={instruments}
              renderMobileCard={(row) => {
                const needsRever = ['EXPIRING_SOON', 'EXPIRED', 'RE_VERIFICATION_REQUIRED'].includes(row.current_status);
                return (
                  <div>
                    <div className="mobile-card-header">
                      <div>
                        <span className="mobile-card-title-label">Instrument UID</span>
                        <div className="mobile-card-title-val">{row.instrument_uid}</div>
                      </div>
                      <StatusBadge status={row.current_status} size="small" />
                    </div>

                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Type &amp; Category</span>
                      <span className="mobile-card-val">
                        <strong>{row.instrument_type}</strong> ({row.category})
                      </span>
                    </div>

                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Serial Number</span>
                      <span className="mobile-card-val">{row.serial_number}</span>
                    </div>

                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Capacity</span>
                      <span className="mobile-card-val">{row.max_capacity} {row.unit}</span>
                    </div>

                    {row.latest_certificate && (
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">Latest Certificate</span>
                        <span className="mobile-card-val" style={{ color: '#007A64', fontWeight: '700' }}>
                          {row.latest_certificate.certificate_number}
                        </span>
                      </div>
                    )}

                    <div className="mobile-card-actions">
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => onNavigate('instrument-detail', row.id)}
                      >
                        View History
                      </button>
                      {row.latest_certificate && (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => onNavigate('certificate-detail', row.latest_certificate.id)}
                        >
                          Certificate
                        </button>
                      )}
                      {needsRever && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleStartReverification(row.id)}
                        >
                          Start Re-Verification
                        </button>
                      )}
                    </div>
                  </div>
                );
              }}
            />
          )}
        </div>
      )}

      {/* 6. DIGITAL CERTIFICATES ARCHIVE SECTION */}
      {(activeTab === 'all' || activeTab === 'certificates') && (
        <div className="section-card">
          <div className="section-card-header">
            <div>
              <h3 className="section-card-title">Digital Certificates</h3>
              <p className="section-card-sub">
                Cryptographically sealed verification certificates with SHA-256 tamper-evident seals
              </p>
            </div>
            <button
              type="button"
              className="btn btn-navy btn-sm"
              onClick={() => onNavigate('public-scanner')}
            >
              Verify Public QR &rarr;
            </button>
          </div>

          {certificatesList.length === 0 ? (
            <div className="empty-state-box">
              <ShieldCheck size={42} className="empty-state-icon" />
              <h4>No Certificates Issued Yet</h4>
              <p>
                Certificates are issued immediately upon passing metrological field or laboratory verification.
              </p>
            </div>
          ) : (
            <ResponsiveTable
              columns={[
                {
                  key: 'certificate_number',
                  label: 'Certificate Number',
                  render: (row) => (
                    <span style={{ fontWeight: '700', fontFamily: 'monospace', color: '#007A64' }}>
                      {row.certificate_number}
                    </span>
                  )
                },
                {
                  key: 'instrument_type',
                  label: 'Instrument',
                  render: (row) => (
                    <div>
                      <strong>{row.instrument_type}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{row.instrument_uid}</div>
                    </div>
                  )
                },
                {
                  key: 'validity_status',
                  label: 'Status',
                  render: (row) => <StatusBadge status={row.validity_status} size="small" />
                },
                {
                  key: 'expiry_date',
                  label: 'Expiry Date',
                  render: (row) => (
                    <span style={{ color: '#B45309', fontWeight: '600' }}>
                      {new Date(row.expiry_date).toLocaleDateString()}
                    </span>
                  )
                },
                {
                  key: 'actions',
                  label: 'Action',
                  isAction: true,
                  render: (row) => (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => onNavigate('certificate-detail', row.id)}
                    >
                      View &amp; PDF
                    </button>
                  )
                }
              ]}
              data={certificatesList}
              renderMobileCard={(row) => (
                <div>
                  <div className="mobile-card-header">
                    <div>
                      <span className="mobile-card-title-label">Certificate</span>
                      <div className="mobile-card-title-val" style={{ color: '#007A64' }}>
                        {row.certificate_number}
                      </div>
                    </div>
                    <StatusBadge status={row.validity_status} size="small" />
                  </div>

                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Instrument</span>
                    <span className="mobile-card-val">{row.instrument_type} ({row.instrument_uid})</span>
                  </div>

                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Valid Until</span>
                    <span className="mobile-card-val" style={{ color: '#B45309', fontWeight: '700' }}>
                      {new Date(row.expiry_date).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="mobile-card-actions">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => onNavigate('certificate-detail', row.id)}
                    >
                      View &amp; Download PDF
                    </button>
                  </div>
                </div>
              )}
            />
          )}
        </div>
      )}
    </div>
  );
};
