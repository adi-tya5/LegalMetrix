import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { DemoDisclaimer } from '../components/DemoDisclaimer';

export const AdminDashboard = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState(null);
  const [pendingApps, setPendingApps] = useState([]);
  const [recentAudits, setRecentAudits] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, apps, audits] = await Promise.all([
        apiRequest('/reports/metrics'),
        apiRequest('/applications/?status=SUBMITTED'),
        apiRequest('/audit/?limit=8')
      ]);
      setMetrics(m);
      setPendingApps(apps);
      setRecentAudits(audits);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <div style={{ padding: '2rem' }}>Loading Admin Control Centre...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0F2537' }}>
            Directorate Control Centre &amp; Allocation Desk
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.875rem' }}>
            Legal Metrology Administration &bull; Verifier Allocation &bull; Rules &amp; Fee Governance
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-navy" onClick={() => onNavigate('rules')}>
            ⚙️ Rules Engine
          </button>
          <button className="btn btn-navy" onClick={() => onNavigate('fees')}>
            💳 Fee Engine
          </button>
          <button className="btn btn-primary" onClick={() => onNavigate('allocation')}>
            👥 Verifier Allocation
          </button>
        </div>
      </div>

      <DemoDisclaimer />

      {/* 10 Operational Metrics Grid */}
      <div className="grid-4" style={{ marginBottom: '1.75rem' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#EFF6FF', color: '#3B82F6' }}>⚖️</div>
          <div>
            <div className="stat-value">{metrics?.total_instruments || 0}</div>
            <div className="stat-label">Total Instruments</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#FFFBEB', color: '#F59E0B' }}>📥</div>
          <div>
            <div className="stat-value">{metrics?.pending_applications || 0}</div>
            <div className="stat-label">Pending Apps</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#F5F3FF', color: '#8B5CF6' }}>👥</div>
          <div>
            <div className="stat-value">{metrics?.assigned_applications || 0}</div>
            <div className="stat-label">Assigned Verifier</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ECFEFF', color: '#06B6D4' }}>📅</div>
          <div>
            <div className="stat-value">{metrics?.scheduled_verifications || 0}</div>
            <div className="stat-label">Scheduled</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>🔍</div>
          <div>
            <div className="stat-value">{metrics?.under_verification || 0}</div>
            <div className="stat-label">Under Verification</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ECFDF5', color: '#10B981' }}>📜</div>
          <div>
            <div className="stat-value">{metrics?.certificates_issued || 0}</div>
            <div className="stat-label">Certificates Issued</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#FFF7ED', color: '#EA580C' }}>⏰</div>
          <div>
            <div className="stat-value">{metrics?.expiring_certificates || 0}</div>
            <div className="stat-label">Expiring Soon</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#FEF2F2', color: '#DC2626' }}>❌</div>
          <div>
            <div className="stat-value">{(metrics?.expired_instruments || 0) + (metrics?.reverification_required || 0)}</div>
            <div className="stat-label">Re-Verif Required</div>
          </div>
        </div>
      </div>

      {/* Applications Awaiting Allocation Desk */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <span>📥</span> Applications Awaiting Verifier Allocation (Payment Completed)
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => onNavigate('allocation')}>
            View Allocation Desk &rarr;
          </button>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>App Number</th>
                <th>Instrument UID</th>
                <th>Instrument Type</th>
                <th>Applicant</th>
                <th>Fee Paid</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingApps.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '1.5rem', color: '#94A3B8' }}>
                    No submitted applications currently awaiting allocation.
                  </td>
                </tr>
              ) : (
                pendingApps.map((app) => (
                  <tr key={app.id}>
                    <td style={{ fontWeight: '700', fontFamily: 'monospace' }}>{app.application_number}</td>
                    <td>{app.instrument_uid}</td>
                    <td>{app.instrument_type}</td>
                    <td>{app.applicant_name}</td>
                    <td style={{ fontWeight: '600', color: '#007A64' }}>₹{app.fee_amount}</td>
                    <td><StatusBadge status={app.current_status} /></td>
                    <td>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => onNavigate('allocation', app.id)}
                      >
                        Allocate to LMO / GATC
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Immutable Audit Trail Snip */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <span>📜</span> Recent Immutable Audit Ledger Records
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => onNavigate('audit')}>
            Full Audit Trail &rarr;
          </button>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Timestamp (UTC)</th>
                <th>Actor</th>
                <th>Role</th>
                <th>Event Type</th>
                <th>Target Entity</th>
                <th>Entity ID</th>
              </tr>
            </thead>
            <tbody>
              {recentAudits.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontSize: '0.78rem', color: '#64748B' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td style={{ fontWeight: '600' }}>{log.actor_name}</td>
                  <td><StatusBadge status={log.actor_role} /></td>
                  <td style={{ fontFamily: 'monospace', fontWeight: '600', fontSize: '0.8rem', color: '#0F2537' }}>
                    {log.event_type}
                  </td>
                  <td>{log.entity_name}</td>
                  <td style={{ fontFamily: 'monospace', color: '#007A64' }}>{log.entity_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
