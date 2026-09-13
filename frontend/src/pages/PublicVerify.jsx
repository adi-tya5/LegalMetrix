import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { DemoDisclaimer } from '../components/DemoDisclaimer';
import { SkeletonCard } from '../components/SkeletonLoader';
import {
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Calendar,
  Scale,
  ArrowLeft,
  AlertTriangle
} from 'lucide-react';

export const PublicVerify = ({ certificateId, onNavigate }) => {
  const [certData, setCertData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!certificateId) return;
    setLoading(true);
    setError(null);
    apiRequest(`/verify/${certificateId}`)
      .then(setCertData)
      .catch(err => setError(err.message || 'Certificate verification failed'))
      .finally(() => setLoading(false));
  }, [certificateId]);

  if (loading) {
    return (
      <div className="dashboard-container" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <SkeletonCard rows={4} />
      </div>
    );
  }

  return (
    <div className="dashboard-container" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div className="brand-logo" style={{ margin: '0 auto 0.5rem auto' }}>LM</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0F2537' }}>
          Official Certificate Verification
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.85rem' }}>
          Real-time statutory authenticity &amp; cryptographic validity check
        </p>
      </div>

      <DemoDisclaimer />

      {error ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', border: '1px solid #FECACA', background: '#FEF2F2' }}>
          <XCircle size={40} color="#DC2626" style={{ margin: '0 auto 0.75rem auto' }} />
          <h3 style={{ color: '#991B1B', fontWeight: '800' }}>Invalid Certificate</h3>
          <p style={{ color: '#7F1D1D', fontSize: '0.875rem', marginTop: '0.5rem' }}>{error}</p>
          <button className="btn btn-outline btn-sm" onClick={() => onNavigate('public-scanner')} style={{ marginTop: '1.25rem' }}>
            Open Scanner
          </button>
        </div>
      ) : (
        certData && (
          <div className="card" style={{ border: '2px solid #007A64', padding: '1.75rem' }}>
            <div style={{ textAlign: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#ECFDF5', color: '#065F46', padding: '0.35rem 0.85rem', borderRadius: '9999px', fontWeight: '700', fontSize: '0.85rem', marginBottom: '0.75rem', border: '1px solid #A7F3D0' }}>
                <CheckCircle2 size={16} strokeWidth={2.5} />
                <span>CERTIFICATE VERIFIED</span>
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: '800', fontFamily: 'monospace', color: '#0F2537' }}>
                {certData.certificate_number}
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <StatusBadge status={certData.validity_status} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B' }}>Instrument:</span>
                <strong>{certData.instrument_type}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B' }}>Masked Identifier:</span>
                <span className="font-mono">{certData.instrument_masked_id}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B' }}>Accuracy Class:</span>
                <span>{certData.accuracy_class || 'Class III'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B' }}>Verification Date:</span>
                <span>{new Date(certData.verification_date).toLocaleDateString()}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B' }}>Valid Until:</span>
                <strong style={{ color: '#B45309' }}>{new Date(certData.expiry_date).toLocaleDateString()}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B' }}>Verifying Authority:</span>
                <span>{certData.verifier_type} Authority</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B' }}>SHA-256 Fingerprint:</span>
                <span className="font-mono" style={{ color: '#007A64', fontSize: '0.8rem' }}>
                  {certData.display_fingerprint}
                </span>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', background: '#F8FAFC', padding: '0.75rem', borderRadius: '6px', fontSize: '0.75rem', color: '#64748B', border: '1px solid #E2E8F0', textAlign: 'center' }}>
              🔒 Privacy-Safe Public View &bull; Owner personal details, GPS location, and inspection evidence photos are strictly redacted on public verification endpoints.
            </div>

            <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
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
