import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { DemoDisclaimer } from '../components/DemoDisclaimer';

export const PublicVerify = ({ certificateId, onNavigate }) => {
  const [certData, setCertData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!certificateId) return;
    setLoading(true);
    // Public endpoint: requires NO authentication header, routed via centralized client
    apiRequest(`/verify/${certificateId}`)
      .then(setCertData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [certificateId]);

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Scanning &amp; Verifying Certificate Signature...</div>;

  return (
    <div style={{ maxWidth: '580px', margin: '1.5rem auto', padding: '0.75rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div className="brand-logo" style={{ margin: '0 auto 0.5rem auto' }}>LM</div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0F2537' }}>
          Official LegalMetrix Public Verification
        </h2>
        <p style={{ fontSize: '0.8rem', color: '#64748B' }}>
          Real-time authenticity, validity &amp; cryptographic integrity check.
        </p>
      </div>

      <DemoDisclaimer />

      {error ? (
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem', border: '1px solid #FECACA', backgroundColor: '#FEF2F2' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>❌</div>
          <h3 style={{ color: '#991B1B', fontWeight: '800' }}>Invalid Certificate</h3>
          <p style={{ color: '#7F1D1D', fontSize: '0.85rem', marginTop: '0.25rem' }}>{error}</p>
        </div>
      ) : (
        certData && (
          <div className="card" style={{ border: '2px solid #007A64', padding: '1.25rem' }}>
            {/* Status Header */}
            <div style={{ textAlign: 'center', paddingBottom: '1.25rem', borderBottom: '1px solid #E2E8F0', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                CERTIFICATE ID
              </div>
              <div style={{ fontSize: 'clamp(1.1rem, 5vw, 1.5rem)', fontWeight: '800', fontFamily: 'monospace', color: '#0F2537', wordBreak: 'break-all' }}>
                {certData.certificate_number}
              </div>
              <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <StatusBadge status={certData.validity_status} />
                <span className={`badge ${certData.integrity_status === 'VERIFIED' ? 'badge-valid' : 'badge-expired'}`}>
                  ● {certData.integrity_status}
                </span>
              </div>
            </div>

            {/* Privacy-Safe Device Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem' }}>
                <span style={{ color: '#64748B' }}>Instrument Classification:</span>
                <span style={{ fontWeight: '700' }}>{certData.instrument_type}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem' }}>
                <span style={{ color: '#64748B' }}>Masked Identifier:</span>
                <span style={{ fontWeight: '700', fontFamily: 'monospace' }}>{certData.instrument_masked_id}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem' }}>
                <span style={{ color: '#64748B' }}>Accuracy Class:</span>
                <span style={{ fontWeight: '600' }}>{certData.accuracy_class || 'Demo'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem' }}>
                <span style={{ color: '#64748B' }}>Verification Date:</span>
                <span style={{ fontWeight: '600' }}>{new Date(certData.verification_date).toLocaleDateString()}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem' }}>
                <span style={{ color: '#64748B' }}>Certificate Expiry Date:</span>
                <span style={{ fontWeight: '700', color: '#B45309' }}>
                  {new Date(certData.expiry_date).toLocaleDateString()}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem' }}>
                <span style={{ color: '#64748B' }}>Verifying Authority:</span>
                <span style={{ fontWeight: '600' }}>{certData.verifier_type} Authority</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem' }}>
                <span style={{ color: '#64748B' }}>SHA-256 Fingerprint:</span>
                <span style={{ fontWeight: '700', fontFamily: 'monospace', color: '#007A64', wordBreak: 'break-all' }}>
                  {certData.display_fingerprint}
                </span>
              </div>
            </div>

            {/* Privacy Safeguards Statement */}
            <div style={{ marginTop: '1.5rem', background: '#F8FAFC', padding: '0.85rem', borderRadius: '6px', fontSize: '0.75rem', color: '#64748B', border: '1px solid #E2E8F0' }}>
              <strong>🔒 Privacy-Protected Public View:</strong> In accordance with SIH data privacy guidelines, owner personal contact details, physical GPS coordinates, and raw inspection evidence photos are strictly withheld on public verification endpoints.
            </div>

            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <button className="btn btn-outline btn-sm" onClick={() => onNavigate('dashboard')}>
                Return to Portal
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
};
