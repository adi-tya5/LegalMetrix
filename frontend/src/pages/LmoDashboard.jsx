import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { DemoDisclaimer } from '../components/DemoDisclaimer';
import { ResponsiveTable } from '../components/ResponsiveTable';
import { SkeletonStats, SkeletonTable } from '../components/SkeletonLoader';
import {
  ClipboardList,
  Calendar,
  Scale,
  CheckCircle2,
  Clock,
  Play,
  RotateCcw,
  RefreshCw,
  FileText
} from 'lucide-react';

export const LmoDashboard = ({ onNavigate, isGatc = false }) => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const roleTitle = isGatc ? 'GATC Verification Docket' : 'Legal Metrology Officer (LMO)';

  const loadAssigned = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/applications/');
      setApplications(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssigned();
  }, []);

  const handleStartInspection = async (appId) => {
    try {
      const ver = await apiRequest('/verifications/start', {
        method: 'POST',
        body: JSON.stringify({ application_id: appId })
      });
      onNavigate('field-verification', ver.id);
    } catch (err) {
      alert(`Could not start inspection: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <SkeletonStats />
        <SkeletonTable rows={3} cols={5} />
      </div>
    );
  }

  const assignedCount = applications.length;
  const scheduledCount = applications.filter(a => a.current_status === 'VERIFICATION_SCHEDULED').length;
  const inProgressCount = applications.filter(a => a.current_status === 'UNDER_VERIFICATION').length;
  const completedCount = applications.filter(a => ['CERTIFICATE_ISSUED', 'RE_VERIFICATION_REQUIRED'].includes(a.current_status)).length;

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="page-header-block">
        <div>
          <h1 className="page-main-title">{roleTitle} Docket</h1>
          <p className="page-sub-title">
            Assigned field verification pipeline, schedule management, and test recording queue
          </p>
        </div>

        <div className="page-actions-group">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={loadAssigned}
          >
            <RefreshCw size={14} />
            <span>Refresh Docket</span>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onNavigate('field-verification')}
          >
            <Play size={14} />
            <span>Active Inspection</span>
          </button>
        </div>
      </div>

      <DemoDisclaimer />

      {/* 5-Second Clarity Metrics */}
      <div className="compact-summary-row" style={{ marginBottom: '1.5rem' }}>
        <div className="summary-pill-card">
          <div className="pill-icon-box bg-blue">
            <ClipboardList size={20} />
          </div>
          <div className="pill-content">
            <span className="pill-value">{assignedCount}</span>
            <span className="pill-label">Total Assigned</span>
          </div>
        </div>

        <div className="summary-pill-card">
          <div className="pill-icon-box bg-purple">
            <Calendar size={20} />
          </div>
          <div className="pill-content">
            <span className="pill-value">{scheduledCount}</span>
            <span className="pill-label">Scheduled</span>
          </div>
        </div>

        <div className="summary-pill-card">
          <div className="pill-icon-box bg-amber">
            <Clock size={20} />
          </div>
          <div className="pill-content">
            <span className="pill-value">{inProgressCount}</span>
            <span className="pill-label">In Testing</span>
          </div>
        </div>

        <div className="summary-pill-card">
          <div className="pill-icon-box bg-green">
            <CheckCircle2 size={20} />
          </div>
          <div className="pill-content">
            <span className="pill-value">{completedCount}</span>
            <span className="pill-label">Completed</span>
          </div>
        </div>
      </div>

      {/* Assigned Pipeline Table with Responsive Table */}
      <div className="section-card">
        <div className="section-card-header">
          <div>
            <h3 className="section-card-title">Assigned Field Verification Pipeline</h3>
            <p className="section-card-sub">
              Dockets queued for physical / laboratory verification and certificate issuance
            </p>
          </div>
          <span className="badge badge-info">{applications.length} Dockets</span>
        </div>

        {applications.length === 0 ? (
          <div className="empty-state-box">
            <ClipboardList size={40} className="empty-state-icon" />
            <h4>No Assigned Verifications</h4>
            <p>Your officer docket queue is currently clear.</p>
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
                    <div style={{ fontSize: '0.75rem', color: '#007A64', fontFamily: 'monospace' }}>
                      {row.instrument_uid}
                    </div>
                  </div>
                )
              },
              {
                key: 'scheduled_date',
                label: 'Scheduled Date',
                render: (row) => (
                  <div>
                    <strong>{row.scheduled_date ? new Date(row.scheduled_date).toLocaleDateString() : 'Immediate'}</strong>
                    <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                      {row.scheduled_notes || 'Standard testing protocol'}
                    </div>
                  </div>
                )
              },
              {
                key: 'current_status',
                label: 'Workflow Status',
                render: (row) => <StatusBadge status={row.current_status} size="small" />
              },
              {
                key: 'actions',
                label: 'Action',
                isAction: true,
                render: (row) => {
                  const canStart = ['VERIFICATION_SCHEDULED', 'UNDER_VERIFICATION', 'LMO_ASSIGNED', 'SUBMITTED'].includes(row.current_status);
                  return (
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      {canStart ? (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleStartInspection(row.id)}
                        >
                          <Play size={12} />
                          <span>Start Verification</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => onNavigate('instrument-detail', row.instrument_id)}
                        >
                          View Record
                        </button>
                      )}
                    </div>
                  );
                }
              }
            ]}
            data={applications}
            renderMobileCard={(row) => {
              const canStart = ['VERIFICATION_SCHEDULED', 'UNDER_VERIFICATION', 'LMO_ASSIGNED', 'SUBMITTED'].includes(row.current_status);
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
                    <span className="mobile-card-label">Schedule</span>
                    <span className="mobile-card-val">
                      {row.scheduled_date ? new Date(row.scheduled_date).toLocaleDateString() : 'Immediate / On Demand'}
                    </span>
                  </div>

                  <div className="mobile-card-actions">
                    {canStart ? (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm btn-block"
                        onClick={() => handleStartInspection(row.id)}
                      >
                        <Play size={13} />
                        <span>Start Verification</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm btn-block"
                        onClick={() => onNavigate('instrument-detail', row.instrument_id)}
                      >
                        View Record
                      </button>
                    )}
                  </div>
                </div>
              );
            }}
          />
        )}
      </div>
    </div>
  );
};
