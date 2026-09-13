import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { DemoDisclaimer } from '../components/DemoDisclaimer';
import { ResponsiveTable } from '../components/ResponsiveTable';
import { SkeletonStats, SkeletonTable } from '../components/SkeletonLoader';
import {
  Shield,
  UserPlus,
  Sliders,
  CreditCard,
  FileSpreadsheet,
  BarChart3,
  ArrowRight,
  Scale,
  Inbox,
  Calendar,
  Activity,
  AlertTriangle,
  FileText
} from 'lucide-react';

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
        apiRequest('/audit/?limit=6')
      ]);
      setMetrics(m);
      setPendingApps(apps || []);
      setRecentAudits(audits || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-container">
        <SkeletonStats />
        <SkeletonTable rows={3} cols={6} />
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="page-header-block">
        <div>
          <h1 className="page-main-title">Directorate Control Centre</h1>
          <p className="page-sub-title">
            Legal Metrology Administration &bull; Verifier Allocation &bull; Rules &amp; Fee Governance
          </p>
        </div>

        <div className="page-actions-group">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => onNavigate('rules')}
          >
            <Sliders size={15} />
            <span>Rules Engine</span>
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => onNavigate('fees')}
          >
            <CreditCard size={15} />
            <span>Fee Engine</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onNavigate('allocation')}
          >
            <UserPlus size={15} />
            <span>Allocation Desk</span>
          </button>
        </div>
      </div>

      <DemoDisclaimer />

      {/* 4-Stat Core Operational Metrics */}
      <div className="compact-summary-row" style={{ marginBottom: '1.5rem' }}>
        <div className="summary-pill-card" onClick={() => onNavigate('allocation')}>
          <div className="pill-icon-box bg-amber">
            <Inbox size={20} />
          </div>
          <div className="pill-content">
            <span className="pill-value">{metrics?.pending_applications || pendingApps.length}</span>
            <span className="pill-label">Awaiting Allocation</span>
          </div>
        </div>

        <div className="summary-pill-card">
          <div className="pill-icon-box bg-blue">
            <Calendar size={20} />
          </div>
          <div className="pill-content">
            <span className="pill-value">{metrics?.scheduled_verifications || 0}</span>
            <span className="pill-label">Scheduled Tests</span>
          </div>
        </div>

        <div className="summary-pill-card">
          <div className="pill-icon-box bg-green">
            <Activity size={20} />
          </div>
          <div className="pill-content">
            <span className="pill-value">{metrics?.certificates_issued || 0}</span>
            <span className="pill-label">Certificates Issued</span>
          </div>
        </div>

        <div className="summary-pill-card">
          <div className="pill-icon-box bg-purple">
            <AlertTriangle size={20} />
          </div>
          <div className="pill-content">
            <span className="pill-value">
              {(metrics?.expired_instruments || 0) + (metrics?.reverification_required || 0)}
            </span>
            <span className="pill-label">Re-Verif Required</span>
          </div>
        </div>
      </div>

      {/* Pending Allocation Desk */}
      <div className="section-card">
        <div className="section-card-header">
          <div>
            <h3 className="section-card-title">Applications Awaiting Verifier Allocation</h3>
            <p className="section-card-sub">
              Payment cleared; pending assignment to designated LMO or GATC test centre
            </p>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => onNavigate('allocation')}
          >
            Open Allocation Desk &rarr;
          </button>
        </div>

        {pendingApps.length === 0 ? (
          <div className="empty-state-box">
            <Inbox size={40} className="empty-state-icon" />
            <h4>All Submitted Applications Allocated</h4>
            <p>There are no submitted verification applications currently pending officer allocation.</p>
          </div>
        ) : (
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
                label: 'Instrument & UID',
                render: (row) => (
                  <div>
                    <div style={{ fontWeight: '600' }}>{row.instrument_type}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{row.instrument_uid}</div>
                  </div>
                )
              },
              {
                key: 'applicant_name',
                label: 'Applicant Owner',
                render: (row) => row.applicant_name
              },
              {
                key: 'fee_amount',
                label: 'Fee Paid',
                render: (row) => (
                  <strong style={{ color: '#007A64' }}>₹{row.fee_amount}</strong>
                )
              },
              {
                key: 'current_status',
                label: 'Status',
                render: (row) => <StatusBadge status={row.current_status} size="small" />
              },
              {
                key: 'actions',
                label: 'Action',
                isAction: true,
                render: (row) => (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => onNavigate('allocation', row.id)}
                  >
                    Allocate to LMO / GATC
                  </button>
                )
              }
            ]}
            data={pendingApps}
            renderMobileCard={(row) => (
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
                  <span className="mobile-card-label">Applicant</span>
                  <span className="mobile-card-val">{row.applicant_name}</span>
                </div>

                <div className="mobile-card-row">
                  <span className="mobile-card-label">Fee Paid</span>
                  <span className="mobile-card-val" style={{ color: '#007A64', fontWeight: '700' }}>
                    ₹{row.fee_amount}
                  </span>
                </div>

                <div className="mobile-card-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm btn-block"
                    onClick={() => onNavigate('allocation', row.id)}
                  >
                    Allocate to LMO / GATC
                  </button>
                </div>
              </div>
            )}
          />
        )}
      </div>

      {/* Immutable Audit Trail Ledger */}
      <div className="section-card">
        <div className="section-card-header">
          <div>
            <h3 className="section-card-title">Recent Immutable Audit Trail Events</h3>
            <p className="section-card-sub">
              Append-only statutory audit trail &bull; Strict event logging across all verification actions
            </p>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => onNavigate('audit')}
          >
            View Full Audit Trail &rarr;
          </button>
        </div>

        <ResponsiveTable
          columns={[
            {
              key: 'timestamp',
              label: 'Timestamp (UTC)',
              render: (row) => (
                <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                  {new Date(row.timestamp).toLocaleString()}
                </span>
              )
            },
            {
              key: 'actor_name',
              label: 'Actor & Role',
              render: (row) => (
                <div>
                  <strong>{row.actor_name}</strong>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{row.actor_role}</div>
                </div>
              )
            },
            {
              key: 'event_type',
              label: 'Event Type',
              render: (row) => (
                <span style={{ fontFamily: 'monospace', fontWeight: '600', fontSize: '0.8rem', color: '#0F2537' }}>
                  {row.event_type}
                </span>
              )
            },
            {
              key: 'entity',
              label: 'Entity Target',
              render: (row) => (
                <span>{row.entity_name} ({row.entity_id})</span>
              )
            }
          ]}
          data={recentAudits}
          renderMobileCard={(row) => (
            <div>
              <div className="mobile-card-header">
                <div>
                  <span className="mobile-card-title-label">Event</span>
                  <div className="mobile-card-title-val font-mono" style={{ fontSize: '0.85rem' }}>
                    {row.event_type}
                  </div>
                </div>
                <StatusBadge status={row.actor_role} size="small" />
              </div>

              <div className="mobile-card-row">
                <span className="mobile-card-label">Actor</span>
                <span className="mobile-card-val">{row.actor_name}</span>
              </div>

              <div className="mobile-card-row">
                <span className="mobile-card-label">Target</span>
                <span className="mobile-card-val">{row.entity_name} ({row.entity_id})</span>
              </div>

              <div className="mobile-card-row">
                <span className="mobile-card-label">Time</span>
                <span className="mobile-card-val" style={{ fontSize: '0.75rem', color: '#64748B' }}>
                  {new Date(row.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
};
