import React, { useState, useEffect } from 'react';
import { apiRequest, getEndpointUrl, downloadCertificatePdf } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { DemoDisclaimer } from '../components/DemoDisclaimer';
import { SkeletonCard } from '../components/SkeletonLoader';
import {
  ShieldCheck,
  Download,
  QrCode,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Calendar,
  Scale,
  UserCheck,
  ExternalLink,
  RefreshCw,
  Hash,
  AlertTriangle
} from 'lucide-react';

export const CertificateDetail = ({ certificateId, onNavigate }) => {
  const [cert, setCert] = useState(null);
  const [integrityRes, setIntegrityRes] = useState(null);
  const [checkingIntegrity, setCheckingIntegrity] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCertificate = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest(`/certificates/${certificateId}`);
      setCert(data);
      const integrity = await apiRequest(`/certificates/${certificateId}/verify-integrity`);
      setIntegrityRes(integrity);
    } catch (err) {
      console.error(err);
      setError('Unable to load certificate details. Please check the Certificate ID.');
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
      alert(`Integrity check notice: ${err.message}`);
    } finally {
      setCheckingIntegrity(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!cert) return;
    setDownloadingPdf(true);
    try {
      await downloadCertificatePdf(cert.id, cert.certificate_number);
    } catch (err) {
      alert(`Download notice: ${err.message}`);
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container" style={{ maxWidth: '780px', margin: '0 auto' }}>
        <SkeletonCard rows={3} />
        <SkeletonCard rows={4} />
      </div>
    );
  }

  if (error || !cert) {
    return (
      <div className="dashboard-container" style={{ maxWidth: '780px', margin: '0 auto' }}>
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <AlertTriangle size={36} color="#DC2626" style={{ margin: '0 auto 1rem auto' }} />
          <h3>Unable to Load Certificate</h3>
          <p style={{ color: '#64748B', marginTop: '0.5rem' }}>{error || 'Certificate not found'}</p>
          <button className="btn btn-primary" onClick={() => onNavigate('dashboard')} style={{ marginTop: '1.5rem' }}>
            &larr; Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const issueDateStr = new Date(cert.issue_date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  const expiryDateStr = new Date(cert.expiry_date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="dashboard-container" style={{ maxWidth: '780px', margin: '0 auto' }}>
      {/* Top Navigation */}
      <div className="page-header-block" style={{ marginBottom: '1rem' }}>
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
          <h1 className="page-main-title">Digital Compliance Certificate</h1>
          <p className="page-sub-title">
            Statutory metrological verification certificate issued under Legal Metrology Act &amp; Rules
          </p>
        </div>

        <div className="page-actions-group">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
          >
            <Download size={15} />
            <span>{downloadingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
          </button>
        </div>
      </div>

      <DemoDisclaimer />

      {/* 1. TOP OFFICIAL VERIFIED SUMMARY BANNER */}
      <div className="cert-verified-hero-banner">
        <div className="cert-verified-header">
          <div className="cert-verified-pill">
            <CheckCircle2 size={18} strokeWidth={2.5} />
            <span>CERTIFICATE VERIFIED</span>
          </div>
          <span className="cert-verified-sublabel">Official Government Metrology Portal</span>
        </div>

        <div className="cert-hero-data-grid">
          <div className="cert-hero-unit">
            <span className="cert-unit-label">Certificate ID</span>
            <span className="cert-unit-val font-mono">{cert.certificate_number}</span>
          </div>

          <div className="cert-hero-unit">
            <span className="cert-unit-label">Verification Date</span>
            <span className="cert-unit-val">{issueDateStr}</span>
          </div>

          <div className="cert-hero-unit">
            <span className="cert-unit-label">Valid Until</span>
            <span className="cert-unit-val text-amber">{expiryDateStr}</span>
          </div>

          <div className="cert-hero-unit">
            <span className="cert-unit-label">Instrument</span>
            <span className="cert-unit-val">{cert.instrument_type}</span>
            <span className="cert-unit-sub font-mono">{cert.instrument_uid}</span>
          </div>

          <div className="cert-hero-unit">
            <span className="cert-unit-label">Verifier Authority</span>
            <span className="cert-unit-val">{cert.verifier_name}</span>
            <span className="cert-unit-sub">{cert.verifier_role || 'LMO Officer'}</span>
          </div>

          <div className="cert-hero-unit">
            <span className="cert-unit-label">Result &amp; Status</span>
            <div style={{ marginTop: '0.2rem' }}>
              <StatusBadge status={cert.validity_status} />
            </div>
          </div>
        </div>
      </div>

      {/* 2. PROMINENT QR CODE & DOWNLOAD SECTION */}
      <div className="section-card cert-qr-showcase-card">
        <div className="cert-qr-showcase-content">
          <div className="cert-qr-img-box">
            <img
              src={getEndpointUrl(cert.qr_code_url || `/certificates/${cert.id}/qr`)}
              alt={`Official verification QR Code for ${cert.certificate_number}`}
              className="cert-qr-img"
              onError={(e) => {
                if (!e.target.dataset.triedFallback) {
                  e.target.dataset.triedFallback = 'true';
                  e.target.src = getEndpointUrl(`/certificates/${cert.id}/qr`);
                }
              }}
            />
            <span className="cert-qr-caption">Public Authentication QR</span>
          </div>

          <div className="cert-qr-actions-box">
            <h3 className="cert-qr-action-title">Verify &amp; Download Certificate</h3>
            <p className="cert-qr-action-desc">
              Scan this dynamic QR code with any smartphone camera to view public verification details and verify cryptographic authenticity.
            </p>

            <div className="cert-qr-buttons-row">
              <button
                type="button"
                className="btn btn-navy"
                onClick={() => onNavigate('public-verify', cert.certificate_number)}
              >
                <QrCode size={16} />
                <span>View Public QR</span>
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
              >
                <Download size={16} />
                <span>{downloadingPdf ? 'Downloading...' : 'Download PDF'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SECONDARY: CERTIFICATE INTEGRITY & SHA-256 SECTION */}
      <div className="section-card cert-integrity-card">
        <div className="section-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={18} className="text-teal" />
            <h3 className="section-card-title">Certificate Integrity &amp; Cryptographic Security</h3>
          </div>
          {integrityRes && (
            <span className={`badge ${integrityRes.is_valid ? 'badge-valid' : 'badge-expired'}`}>
              ● {integrityRes.integrity_status}
            </span>
          )}
        </div>

        <div className="cert-integrity-body">
          <div className="integrity-field">
            <span className="integrity-label">Cryptographic Fingerprint:</span>
            <span className="integrity-fingerprint font-mono">{cert.display_fingerprint}</span>
          </div>

          <div className="integrity-field">
            <span className="integrity-label">SHA-256 Seal Hash:</span>
            <span className="integrity-hash font-mono">{cert.sha256_hash}</span>
          </div>

          <div className="integrity-field">
            <span className="integrity-label">Applied Metrology Rule:</span>
            <span>{cert.applied_rule_id} (Tolerance: ±{cert.permissible_limit}%)</span>
          </div>

          <div className="integrity-actions-row">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleVerifyIntegrity}
              disabled={checkingIntegrity}
            >
              <RefreshCw size={13} className={checkingIntegrity ? 'animate-spin' : ''} />
              <span>{checkingIntegrity ? 'Verifying...' : '⚡ Verify Hash Integrity'}</span>
            </button>

            <span className="integrity-immutability-note">
              <Lock size={12} />
              <span>Permanently immutable &bull; Cryptographically sealed</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
