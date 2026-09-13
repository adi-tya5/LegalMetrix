import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { DemoDisclaimer } from '../components/DemoDisclaimer';

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
      setLogs(data);
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
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <button className="btn btn-outline btn-sm" onClick={() => onNavigate('dashboard')} style={{ marginBottom: '0.5rem' }}>
            &larr; Back to Dashboard
          </button>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0F2537' }}>
            Immutable Cryptographic Audit Trail
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.85rem' }}>
            Append-only tamper-evident event ledger recording all workflow transitions, verifications, and cryptographic actions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            className="form-select"
            style={{ width: '180px', padding: '0.4rem' }}
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

          <button className="btn btn-outline btn-sm" onClick={loadLogs}>
            🔄 Refresh
          </button>
        </div>
      </div>

      <DemoDisclaimer customText="Audit records are stored in an append-only relational ledger. Modifications or silent alterations to historical audit events are strictly prohibited." />

      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <span>📜</span> System Event Ledger ({logs.length})
          </div>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Event ID</th>
                <th>Timestamp (UTC)</th>
                <th>Actor</th>
                <th>Role</th>
                <th>Event Type</th>
                <th>Target Entity</th>
                <th>Entity ID</th>
                <th>Metadata</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8' }}>
                    Loading audit events...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8' }}>
                    No audit records found matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontFamily: 'monospace', color: '#64748B' }}>#{log.id}</td>
                    <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: '600' }}>{log.actor_name}</td>
                    <td><StatusBadge status={log.actor_role} /></td>
                    <td style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '0.8rem', color: '#0F2537' }}>
                      {log.event_type}
                    </td>
                    <td>{log.entity_name}</td>
                    <td style={{ fontFamily: 'monospace', color: '#007A64', fontWeight: '600' }}>
                      {log.entity_id}
                    </td>
                    <td style={{ fontSize: '0.72rem', color: '#475569', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.metadata_json ? JSON.stringify(log.metadata_json) : '-'}
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
