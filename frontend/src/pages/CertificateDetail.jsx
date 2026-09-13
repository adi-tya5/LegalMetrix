import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { DemoDisclaimer } from '../components/DemoDisclaimer';

export const CertificateDetail = ({ certificateId, onNavigate }) => {
  const [cert, setCert] = useState(null);
  const [integrityRes, setIntegrityRes] = useState(null);
  const [checkingIntegrity, setCheckingIntegrity] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCertificate = async () => {
    setLoading(true);
    try {
      const data = await apiRequest(`/certificates/${certificateId}`);
      setCert(data);
      // Automatically verify integrity on load
      const integrity = await apiRequest(`/certificates/${certificateId}/verify-integrity`);
      setIntegrityRes(integrity);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (certificateId) {
      loadCertificate();
    }
  }, [certificateId]);

  const handleVerifyIntegrity = async () => {
    setCheckingIntegrity(true);
    try {
      const res = await apiRequest(`/certificates/${certificateId}/verify-integrity`);
      setIntegrityRes(res);
    } catch (err) {
      alert(`Integrity verification failed: ${err.message}`);
    } finally {
      setCheckingIntegrity(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading digital certificate...</div>;
  if (error || !cert) return <div style={{ padding: '2rem', color: '#DC2626' }}>Error: {error || 'Certificate not found'}</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <button className="btn btn-outline btn-sm" onClick={() => onNavigate('dashboard')} style={{ marginBottom: '0.5rem' }}>
            &larr; Back to Dashboard
          </button>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0F2537' }}>
            Digital Verification &amp; Calibration Certificate
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.85rem' }}>
            Cryptographically sealed verification record with SHA-256 tamper-evident integrity.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <a
            href={`/api/v1/certificates/${cert.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary"
          >
            📥 Download PDF
          </a>
          <button
            className="btn btn-navy"
            onClick={() => onNavigate('public-verify', cert.certificate_number)}
          >
            🔍 Public QR View
          </button>
        </div>
      </div>

      <DemoDisclaimer />

      {/* Certificate Official Paper Card */}
      <div className="card" style={{
        border: '2px solid #007A64',
        boxShadow: '0 10px 25px -5px rgba(0, 122, 100, 0.1)',
        padding: '2.5rem',
        background: '#FFFFFF',
        position: 'relative'
      }}>
        {/* Certificate Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #0F2537', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#007A64', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Smart India Hackathon 2026 Prototype &bull; SIH26036
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0F2537', marginTop: '0.25rem' }}>
            LEGALMETRIX VERIFICATION CERTIFICATE
          </h1>
          <div style={{ fontSize: '0.9rem', color: '#64748B' }}>
            Certificate Number: <strong style={{ color: '#0F2537', fontFamily: 'monospace' }}>{cert.certificate_number}</strong>
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <StatusBadge status="VERIFIED" />
          </div>
        </div>

        {/* Certificate Data Table */}
        <div className="grid-2" style={{ fontSize: '0.9rem', marginBottom: '1.75rem', gap: '1.5rem' }}>
          <div>
            <div style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: '600' }}>INSTRUMENT UID</div>
            <div style={{ fontWeight: '700', fontFamily: 'monospace' }}>{cert.instrument_uid}</div>

            <div style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: '600', marginTop: '0.75rem' }}>INSTRUMENT TYPE</div>
            <div style={{ fontWeight: '700' }}>{cert.instrument_type}</div>

            <div style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: '600', marginTop: '0.75rem' }}>REGISTERED OWNER</div>
            <div style={{ fontWeight: '700' }}>{cert.owner_name}</div>

            <div style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: '600', marginTop: '0.75rem' }}>VALIDITY STATUS</div>
            <div style={{ marginTop: '0.2rem' }}>
              <StatusBadge status={cert.validity_status} />
            </div>
          </div>

          <div>
            <div style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: '600' }}>ISSUE DATE</div>
            <div style={{ fontWeight: '700' }}>{new Date(cert.issue_date).toLocaleDateString()}</div>

            <div style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: '600', marginTop: '0.75rem' }}>EXPIRY DATE</div>
            <div style={{ fontWeight: '700', color: '#B45309' }}>
              {new Date(cert.expiry_date).toLocaleDateString()} ({cert.verification_period_days} Days)
            </div>

            <div style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: '600', marginTop: '0.75rem' }}>VERIFYING AUTHORITY</div>
            <div style={{ fontWeight: '700' }}>{cert.verifier_name} ({cert.verifier_role})</div>

            <div style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: '600', marginTop: '0.75rem' }}>APPLIED PERMISSIBLE RULE</div>
            <div style={{ fontWeight: '700' }}>{cert.applied_rule_id} (±{cert.permissible_limit}%)</div>
          </div>
        </div>

        {/* SHA-256 Integrity & QR Code Section */}
        <div style={{
          background: '#F0FDF4',
          border: '1px solid #007A64',
          borderRadius: '8px',
          padding: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#007A64', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Cryptographic Integrity Fingerprint
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', fontFamily: 'monospace', color: '#0F2537', margin: '0.25rem 0' }}>
              {cert.display_fingerprint}
            </div>
            <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#64748B', wordBreak: 'break-all' }}>
              SHA-256: {cert.sha256_hash}
            </div>

            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                className="btn btn-outline btn-sm"
                onClick={handleVerifyIntegrity}
                disabled={checkingIntegrity}
                style={{ background: 'white' }}
              >
                {checkingIntegrity ? 'Verifying...' : '⚡ Verify Hash Integrity'}
              </button>
              {integrityRes && (
                <span className={`badge ${integrityRes.is_valid ? 'badge-valid' : 'badge-expired'}`}>
                  ● {integrityRes.integrity_status}
                </span>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <img
              src={`/api/v1/certificates/${cert.id}/qr`}
              alt="QR Code"
              style={{ width: '100px', height: '100px', borderRadius: '4px', border: '1px solid #CBD5E1' }}
            />
            <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '0.25rem' }}>
              Scan for Public Verification
            </div>
          </div>
        </div>

        {/* Immutability Notice */}
        <div style={{ fontSize: '0.72rem', color: '#64748B', textAlign: 'center', marginTop: '1.5rem', borderTop: '1px solid #E2E8F0', paddingTop: '0.75rem' }}>
          This digital certificate is permanently immutable and cryptographically bound to instrument {cert.instrument_uid}.
          PUT/DELETE operations are strictly blocked (HTTP 405).
        </div>
      </div>
    </div>
  );
};
