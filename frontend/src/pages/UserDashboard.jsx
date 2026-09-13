import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { DemoDisclaimer } from '../components/DemoDisclaimer';

export const UserDashboard = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState(null);
  const [instruments, setInstruments] = useState([]);
  const [applications, setApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, inst, apps, notifs] = await Promise.all([
        apiRequest('/reports/metrics'),
        apiRequest('/instruments/'),
        apiRequest('/applications/'),
        apiRequest('/notifications/')
      ]);
      setMetrics(m);
      setInstruments(inst);
      setApplications(apps);
      setNotifications(notifs || []);
    } catch (err) {
      setError(err.message);
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
          notes: 'Initiating re-verification via dashboard'
        })
      });
      alert(`Re-Verification application ${res.application_number} created successfully! State: SUBMITTED`);
      loadData();
    } catch (err) {
      alert(`Failed to start re-verification: ${err.message}`);
    }
  };

  const handleMarkNotificationRead = async (notifId) => {
    try {
      await apiRequest(`/notifications/${notifId}/read`, { method: 'POST' });
      setNotifications(prev =>
        prev.map(n => (n.id === notifId ? { ...n, read_status: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading dashboard data...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0F2537' }}>Instrument Owner Portal</h2>
          <p style={{ color: '#64748B', fontSize: '0.875rem' }}>
            Unified view of registered instruments, digital certificates, and verification cycles.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => onNavigate('register-instrument')}>
            ➕ Register Instrument
          </button>
          <button className="btn btn-navy" onClick={() => onNavigate('apply-verification')}>
            📝 Apply for Verification
          </button>
        </div>
      </div>

      <DemoDisclaimer />

      {error && <div style={{ color: '#DC2626', marginBottom: '1rem' }}>{error}</div>}

      {/* Metrics Row */}
      <div className="grid-4" style={{ marginBottom: '1.75rem' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#EFF6FF', color: '#3B82F6' }}>⚖️</div>
          <div>
            <div className="stat-value">{metrics?.total_instruments || 0}</div>
            <div className="stat-label">Total Instruments</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ECFDF5', color: '#10B981' }}>📜</div>
          <div>
            <div className="stat-value">{metrics?.certificates_issued || 0}</div>
            <div className="stat-label">Active Certificates</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#FFFBEB', color: '#F59E0B' }}>⏰</div>
          <div>
            <div className="stat-value">{metrics?.expiring_certificates || 0}</div>
            <div className="stat-label">Expiring Soon (&le;30d)</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#FEF2F2', color: '#EF4444' }}>⚠️</div>
          <div>
            <div className="stat-value">{(metrics?.expired_instruments || 0) + (metrics?.reverification_required || 0)}</div>
            <div className="stat-label">Re-Verification Due</div>
          </div>
        </div>
      </div>

      {/* Notifications & Actionable Alerts Section */}
      {notifications.length > 0 && (
        <div className="card" style={{ marginBottom: '1.75rem', border: '1px solid #E2E8F0' }}>
          <div className="card-header" style={{ borderBottom: '1px solid #E2E8F0' }}>
            <div className="card-title">
              <span>🔔</span> Active Expiry Alerts &amp; Notifications ({notifications.filter(n => !n.read_status).length} unread)
            </div>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => onNavigate('notifications')}
              style={{ fontSize: '0.8rem' }}
            >
              View All Alerts &rarr;
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem' }}>
            {notifications.slice(0, 3).map(n => {
              const isUnread = !n.read_status;
              const isExpiry = n.notification_type === 'EXPIRY_SOON';
              const isExpired = n.notification_type === 'EXPIRED';
              const isFail = n.notification_type === 'RE_VERIFICATION_REQUIRED';

              const bg = isExpired ? '#FEF2F2' : isFail ? '#FFF1F2' : isExpiry ? '#FFFBEB' : '#F8FAFC';
              const border = isExpired ? '#FECACA' : isFail ? '#FDA4AF' : isExpiry ? '#FDE68A' : '#E2E8F0';
              const icon = isExpired ? '🚨' : isFail ? '🛑' : isExpiry ? '⏳' : '🔔';

              return (
                <div
                  key={n.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    backgroundColor: isUnread ? bg : '#FFFFFF',
                    border: `1px solid ${isUnread ? border : '#E2E8F0'}`,
                    gap: '0.75rem',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '0' }}>
                    <span style={{ fontSize: '1.25rem' }}>{icon}</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.9rem', color: '#0F2537' }}>{n.title}</strong>
                        {n.instrument_uid && (
                          <span style={{ fontSize: '0.75rem', background: '#E2E8F0', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: '700' }}>
                            {n.instrument_uid}
                          </span>
                        )}
                      </div>
                      <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.825rem', color: '#475569' }}>
                        {n.message}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {(isExpiry || isExpired || isFail) && (
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: '0.75rem' }}
                        onClick={() => onNavigate('apply-verification', n.instrument_id)}
                      >
                        📝 Re-Verify
                      </button>
                    )}
                    {isUnread ? (
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '0.75rem' }}
                        onClick={() => handleMarkNotificationRead(n.id)}
                      >
                        ✓ Mark Read
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Read</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Instruments Registry Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <span>⚖️</span> Registered Instruments &amp; Lifecycle Status
          </div>
          <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
            One Instrument → One Connected Verification History
          </span>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Instrument ID</th>
                <th>Type &amp; Category</th>
                <th>Serial / Model</th>
                <th>Capacity</th>
                <th>Current Status</th>
                <th>Latest Certificate</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {instruments.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8' }}>
                    No instruments registered yet. Click "Register Instrument" to begin.
                  </td>
                </tr>
              ) : (
                instruments.map((inst) => {
                  const needsRever = ['EXPIRING_SOON', 'EXPIRED', 'RE_VERIFICATION_REQUIRED'].includes(inst.current_status);
                  return (
                    <tr key={inst.id}>
                      <td style={{ fontWeight: '700', fontFamily: 'monospace', color: '#0F2537' }}>
                        {inst.instrument_uid}
                      </td>
                      <td>
                        <div style={{ fontWeight: '600' }}>{inst.instrument_type}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{inst.category}</div>
                      </td>
                      <td>
                        <div>{inst.serial_number}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{inst.manufacturer} ({inst.model_number})</div>
                      </td>
                      <td>{inst.max_capacity} {inst.unit}</td>
                      <td>
                        <StatusBadge status={inst.current_status} />
                      </td>
                      <td>
                        {inst.latest_certificate ? (
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '0.8rem', color: '#007A64' }}>
                              {inst.latest_certificate.certificate_number}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                              Fingerprint: {inst.latest_certificate.display_fingerprint}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>None Issued</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => onNavigate('instrument-detail', inst.id)}
                          >
                            View History
                          </button>
                          
                          {inst.latest_certificate && (
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => onNavigate('certificate-detail', inst.latest_certificate.id)}
                            >
                              Certificate
                            </button>
                          )}

                          {needsRever && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleStartReverification(inst.id)}
                            >
                              Start Re-Verification
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Applications & Workflow Pipeline */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <span>📝</span> Active Applications &amp; Verification Pipeline
          </div>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>App Number</th>
                <th>Instrument</th>
                <th>Type</th>
                <th>Fee</th>
                <th>Payment</th>
                <th>Workflow State</th>
                <th>Assigned Verifier</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8' }}>
                    No verification applications submitted yet.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id}>
                    <td style={{ fontWeight: '700', fontFamily: 'monospace' }}>{app.application_number}</td>
                    <td>{app.instrument_uid} ({app.instrument_type})</td>
                    <td>{app.application_type}</td>
                    <td style={{ fontWeight: '600' }}>₹{app.fee_amount}</td>
                    <td><StatusBadge status={app.payment_status} /></td>
                    <td><StatusBadge status={app.current_status} /></td>
                    <td>
                      {app.assigned_verifier_name ? (
                        <div>
                          <strong>{app.assigned_verifier_name}</strong> ({app.assigned_role})
                        </div>
                      ) : (
                        <span style={{ color: '#94A3B8' }}>Awaiting Allocation</span>
                      )}
                    </td>
                    <td>
                      {app.current_status === 'PAYMENT_PENDING' ? (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => onNavigate('mock-payment', app.id)}
                        >
                          Complete Payment
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#64748B' }}>In Progress</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
