import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { DemoDisclaimer } from '../components/DemoDisclaimer';

export const InstrumentDetail = ({ instrumentId, onNavigate }) => {
  const [instrument, setInstrument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const data = await apiRequest(`/instruments/${instrumentId}`);
      setInstrument(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (instrumentId) {
      loadDetail();
    }
  }, [instrumentId]);

  const handleStartReverification = async () => {
    try {
      const res = await apiRequest('/reverification/start', {
        method: 'POST',
        body: JSON.stringify({
          instrument_id: instrument.id,
          notes: 'Statutory re-verification cycle initiated'
        })
      });
      alert(`Re-Verification application ${res.application_number} submitted! Historical certificate remains permanently preserved.`);
      loadDetail();
    } catch (err) {
      alert(`Failed to start re-verification: ${err.message}`);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading instrument verification lifecycle history...</div>;
  if (error || !instrument) return <div style={{ padding: '2rem', color: '#DC2626' }}>Error: {error || 'Instrument not found'}</div>;

  const needsReverification = ['EXPIRING_SOON', 'EXPIRED', 'RE_VERIFICATION_REQUIRED'].includes(instrument.current_status);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => onNavigate('dashboard')}
            style={{ marginBottom: '0.5rem' }}
          >
            &larr; Back to Dashboard
          </button>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0F2537' }}>
            Instrument Profile: {instrument.instrument_uid}
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.85rem' }}>
            Permanent Profile &bull; One Instrument &rarr; One Connected Verification History
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <StatusBadge status={instrument.current_status} />
          {needsReverification && (
            <button className="btn btn-primary" onClick={handleStartReverification}>
              🔄 Start Re-Verification
            </button>
          )}
        </div>
      </div>

      <DemoDisclaimer />

      {/* Profile Specifications Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <span>ℹ️</span> Instrument Physical &amp; Metrological Specifications
          </div>
        </div>

        <div className="grid-3" style={{ fontSize: '0.9rem' }}>
          <div>
            <div style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>Type &amp; Category</div>
            <div style={{ fontWeight: '700', marginTop: '0.2rem' }}>{instrument.instrument_type}</div>
            <div style={{ color: '#64748B', fontSize: '0.8rem' }}>{instrument.category}</div>
          </div>

          <div>
            <div style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>Manufacturer &amp; Model</div>
            <div style={{ fontWeight: '700', marginTop: '0.2rem' }}>{instrument.manufacturer}</div>
            <div style={{ color: '#64748B', fontSize: '0.8rem' }}>Model: {instrument.model_number}</div>
          </div>

          <div>
            <div style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>Serial Number</div>
            <div style={{ fontWeight: '700', fontFamily: 'monospace', marginTop: '0.2rem', color: '#007A64' }}>
              {instrument.serial_number}
            </div>
          </div>

          <div>
            <div style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>Max Capacity &amp; Class</div>
            <div style={{ fontWeight: '700', marginTop: '0.2rem' }}>{instrument.max_capacity} {instrument.unit}</div>
            <div style={{ color: '#64748B', fontSize: '0.8rem' }}>Class: {instrument.accuracy_class || 'Demo'}</div>
          </div>

          <div>
            <div style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>Registered Owner</div>
            <div style={{ fontWeight: '700', marginTop: '0.2rem' }}>{instrument.owner_name}</div>
          </div>

          <div>
            <div style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>Installation Address</div>
            <div style={{ fontSize: '0.825rem', marginTop: '0.2rem', color: '#334155' }}>
              {instrument.location_address}
            </div>
          </div>
        </div>
      </div>

      {/* Connected Verification History */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <span>📋</span> Complete Verification &amp; Inspection History ({instrument.verification_history.length})
          </div>
          <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
            Historical verification entries are permanent and immutable
          </span>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Verification No</th>
                <th>Date</th>
                <th>Authority</th>
                <th>Reference</th>
                <th>Observed</th>
                <th>Calculated Error</th>
                <th>Applied Limit</th>
                <th>Result</th>
                <th>Remarks / Failure Reason</th>
              </tr>
            </thead>
            <tbody>
              {instrument.verification_history.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '1.5rem', color: '#94A3B8' }}>
                    No field verification records logged yet.
                  </td>
                </tr>
              ) : (
                instrument.verification_history.map((v) => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: '700', fontFamily: 'monospace' }}>{v.verification_number}</td>
                    <td style={{ fontSize: '0.8rem' }}>{new Date(v.verification_date).toLocaleDateString()}</td>
                    <td>
                      <div><strong>{v.verifier_name}</strong></div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{v.verifier_role}</div>
                    </td>
                    <td>{v.reference_value}</td>
                    <td>{v.observed_value}</td>
                    <td style={{ fontWeight: '700', color: (v.percentage_error > 0.5 ? '#DC2626' : '#007A64') }}>
                      {v.percentage_error !== null ? `${v.percentage_error > 0 ? '+' : ''}${v.percentage_error.toFixed(2)}%` : '-'}
                    </td>
                    <td>±{v.applied_limit || 0.50}%</td>
                    <td><StatusBadge status={v.result} /></td>
                    <td style={{ fontSize: '0.8rem', maxWidth: '280px' }}>
                      {v.result === 'FAIL' ? (
                        <div style={{ color: '#991B1B' }}>
                          <strong>Reason:</strong> {v.failure_reason}<br />
                          <strong>Corrective:</strong> {v.corrective_action}
                        </div>
                      ) : (
                        <span style={{ color: '#475569' }}>Within permissible tolerance</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Connected Certificate History */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <span>📜</span> Digital Certificate Archive ({instrument.certificate_history.length})
          </div>
          <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
            Historical certificates remain immutable even after re-verification
          </span>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Certificate Number</th>
                <th>Issue Date</th>
                <th>Expiry Date</th>
                <th>Validity Status</th>
                <th>SHA-256 Fingerprint</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {instrument.certificate_history.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '1.5rem', color: '#94A3B8' }}>
                    No digital certificates issued yet.
                  </td>
                </tr>
              ) : (
                instrument.certificate_history.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: '700', fontFamily: 'monospace', color: '#007A64' }}>
                      {c.certificate_number}
                    </td>
                    <td>{new Date(c.issue_date).toLocaleDateString()}</td>
                    <td>{new Date(c.expiry_date).toLocaleDateString()}</td>
                    <td><StatusBadge status={c.validity_status} /></td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#1E3A5F' }}>
                      {c.display_fingerprint}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => onNavigate('certificate-detail', c.id)}
                        >
                          View &amp; Verify
                        </button>
                        <a
                          href={`/api/v1/certificates/${c.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-primary btn-sm"
                        >
                          📥 PDF
                        </a>
                      </div>
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
