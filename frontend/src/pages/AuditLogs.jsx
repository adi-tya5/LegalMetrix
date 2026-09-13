import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { DemoDisclaimer } from '../components/DemoDisclaimer';
import { ResponsiveTable } from '../components/ResponsiveTable';
import { SkeletonTable } from '../components/SkeletonLoader';
import { ArrowLeft, RefreshCw, FileSpreadsheet } from 'lucide-react';

export const AuditLogs = ({ onNavigate }) => {
  const [logs, setLogs] = useState([]);
  const [entityFilter, setEntityFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      let url = '/audit/?limit=200';
      if (entityFilter) url += `&entity_name=${entityFilter}`;
      const data = await apiRequest(url);
      setLogs(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [entityFilter]);

  return (
    <div className="dashboard-container">
      <div className="page-header-block">
        <div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => onNavigate('dashboard')}
            style={{ marginBottom: '0.5rem' }}
          >
            <ArrowLeft size={14} />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="page-main-title">Immutable Audit Trail</h1>
          <p className="page-sub-title">
            Append-only tamper-evident event ledger recording all workflow transitions, verifications, and cryptographic actions
          </p>
        </div>

        <div className="page-actions-group">
          <select
            className="form-select"
            style={{ minWidth: '150px', padding: '0.45rem 0.65rem', fontSize: '0.85rem' }}
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
          >
            <option value="">All Entities</option>
            <option value="Application">Applications</option>
            <option value="Verification">Verifications</option>
            <option value="Certificate">Certificates</option>
            <option value="Instrument">Instruments</option>
            <option value="Evidence">Evidence</option>
            <option value="Rule">Rules</option>
          </select>

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={loadLogs}
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <DemoDisclaimer customText="Audit records are stored in an append-only relational ledger. Modifications or silent alterations to historical audit events are strictly prohibited." />

      <div className="section-card">
        <div className="section-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileSpreadsheet size={18} className="text-teal" />
            <h3 className="section-card-title">System Event Ledger ({logs.length})</h3>
          </div>
        </div>

        {loading ? (
          <SkeletonTable rows={4} cols={5} />
        ) : (
          <ResponsiveTable
            columns={[
              {
                key: 'id',
                label: 'Event ID',
                render: (row) => (
                  <span className="font-mono" style={{ fontSize: '0.8rem', color: '#64748B' }}>
                    #{row.id}
                  </span>
                )
              },
              {
                key: 'timestamp',
                label: 'Timestamp (UTC)',
                render: (row) => (
                  <span style={{ fontSize: '0.8rem', color: '#475569' }}>
                    {new Date(row.timestamp).toLocaleString()}
                  </span>
                )
              },
              {
                key: 'actor',
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
                  <span className="font-mono" style={{ fontWeight: '700', fontSize: '0.8rem', color: '#0F2537' }}>
                    {row.event_type}
                  </span>
                )
              },
              {
                key: 'entity',
                label: 'Target Entity',
                render: (row) => (
                  <span>
                    {row.entity_name} ({row.entity_id})
                  </span>
                )
              }
            ]}
            data={logs}
            emptyMessage="No audit records found matching criteria."
            renderMobileCard={(row) => (
              <div>
                <div className="mobile-card-header">
                  <div>
                    <span className="mobile-card-title-label">Event #{row.id}</span>
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
                  <span className="mobile-card-label">Target Entity</span>
                  <span className="mobile-card-val">{row.entity_name} ({row.entity_id})</span>
                </div>

                <div className="mobile-card-row">
                  <span className="mobile-card-label">Timestamp</span>
                  <span className="mobile-card-val" style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    {new Date(row.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          />
        )}
      </div>
    </div>
  );
};
