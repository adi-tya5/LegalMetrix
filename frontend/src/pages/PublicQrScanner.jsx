import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { apiRequest } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { DemoDisclaimer } from '../components/DemoDisclaimer';
import {
  Camera,
  Upload,
  Search,
  CheckCircle2,
  XCircle,
  QrCode,
  ShieldCheck,
  Calendar,
  Scale,
  ArrowRight,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

/**
 * Parses raw scanned QR string to extract certificate ID.
 */
export function parseLegalMetrixQrCode(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  const trimmed = rawText.trim();

  // Pattern 1: URL containing /verify/<certificate_id>
  const verifyMatch = trimmed.match(/(?:https?:\/\/[^\/]+)?\/verify\/([a-zA-Z0-9_\-]+)/i);
  if (verifyMatch && verifyMatch[1]) {
    return verifyMatch[1];
  }

  // Pattern 2: Raw certificate identifier format (e.g. CERT-MH-001-0005)
  if (/^CERT[_\-][A-Za-z0-9_\-]+$/i.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export const PublicQrScanner = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'upload' | 'manual'
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);
  const [certData, setCertData] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    setCameraLoading(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser or requires an HTTPS connection.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);
        animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
      }
    } catch (err) {
      console.warn('Camera error:', err);
      setCameraError(err.message || 'Unable to start camera.');
    } finally {
      setCameraLoading(false);
    }
  };

  const scanVideoFrame = () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      if (streamRef.current) {
        animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
      }
      return;
    }

    const video = videoRef.current;
    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvasRef.current = canvas;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code && code.data) {
      stopCamera();
      handleVerifyCertId(code.data);
      return;
    }

    if (streamRef.current) {
      animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
    }
  };

  useEffect(() => {
    if (activeTab === 'camera' && !certData) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab, certData]);

  const handleVerifyCertId = async (inputStr) => {
    setError(null);
    setCertData(null);

    const certId = parseLegalMetrixQrCode(inputStr) || inputStr.trim();
    if (!certId) {
      setError('Please enter or scan a valid Certificate ID (e.g. CERT-MH-001-0001).');
      return;
    }

    setVerifying(true);
    try {
      const data = await apiRequest(`/verify/${certId}`);
      setCertData(data);
    } catch (err) {
      setError(err.message || 'Certificate not found or unverified.');
    } finally {
      setVerifying(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          handleVerifyCertId(code.data);
        } else {
          setError('No QR code detected in the uploaded image. Please try a clearer picture.');
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    setCertData(null);
    setError(null);
    setManualInput('');
    if (activeTab === 'camera') {
      startCamera();
    }
  };

  return (
    <div className="dashboard-container" style={{ maxWidth: '640px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div className="brand-logo" style={{ margin: '0 auto 0.5rem auto' }}>LM</div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0F2537' }}>
          VERIFY CERTIFICATE
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Scan a LegalMetrix certificate to verify its authenticity.
        </p>
      </div>

      <DemoDisclaimer />

      {error && (
        <div className="error-banner" style={{ marginBottom: '1.25rem' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* VERIFIED RESULT CARD */}
      {certData ? (
        <div className="card cert-verified-result-card" style={{ border: '2px solid #007A64', padding: '1.75rem' }}>
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
            🔒 Privacy-Safe Public View &bull; Owner contact details, GPS coordinates, and raw inspection evidence are strictly redacted.
          </div>

          <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={handleReset}>
              <RefreshCw size={14} />
              <span>Verify Another Certificate</span>
            </button>
            <button className="btn btn-outline" onClick={() => onNavigate('dashboard')}>
              Back to Portal
            </button>
          </div>
        </div>
      ) : (
        /* SCANNER INTERFACE */
        <div className="card" style={{ padding: '1.5rem' }}>
          {/* Tabs for scanning mode */}
          <div className="custom-tabs-nav" style={{ marginBottom: '1.25rem' }}>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'camera' ? 'active' : ''}`}
              onClick={() => setActiveTab('camera')}
            >
              <Camera size={15} />
              <span>Camera Scanner</span>
            </button>

            <button
              type="button"
              className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              <Upload size={15} />
              <span>Upload QR Image</span>
            </button>

            <button
              type="button"
              className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
              onClick={() => setActiveTab('manual')}
            >
              <Search size={15} />
              <span>Enter ID</span>
            </button>
          </div>

          {/* Mode 1: Camera Scanner */}
          {activeTab === 'camera' && (
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '280px',
                  backgroundColor: '#0F172A',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  margin: '0 auto 1rem auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <video
                  ref={videoRef}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  muted
                  playsInline
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {/* Laser scan line overlay */}
                <div
                  style={{
                    position: 'absolute',
                    top: '20%',
                    left: '15%',
                    right: '15%',
                    bottom: '20%',
                    border: '2px solid rgba(0, 122, 100, 0.8)',
                    borderRadius: '8px',
                    pointerEvents: 'none',
                    boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.45)'
                  }}
                />

                {cameraLoading && (
                  <div style={{ position: 'absolute', color: 'white', fontSize: '0.85rem' }}>
                    Accessing camera...
                  </div>
                )}
              </div>

              {cameraError ? (
                <div style={{ color: '#DC2626', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  {cameraError}
                  <div style={{ marginTop: '0.5rem' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setActiveTab('upload')}>
                      Try Uploading QR Image Instead
                    </button>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: '0.8rem', color: '#64748B' }}>
                  Point camera at the certificate QR code. Verification begins automatically.
                </p>
              )}
            </div>
          )}

          {/* Mode 2: Upload QR Image */}
          {activeTab === 'upload' && (
            <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
              <div
                style={{
                  border: '2px dashed #CBD5E1',
                  borderRadius: '10px',
                  padding: '2rem 1rem',
                  cursor: 'pointer',
                  background: '#F8FAFC'
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={36} color="#007A64" style={{ margin: '0 auto 0.75rem auto' }} />
                <h4 style={{ color: '#0F2537', fontWeight: '700', fontSize: '1rem' }}>
                  Click to Upload Certificate QR Image
                </h4>
                <p style={{ color: '#64748B', fontSize: '0.825rem', marginTop: '0.25rem' }}>
                  Supports PNG, JPG, JPEG photos of printed or digital certificates
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
              </div>
            </div>
          )}

          {/* Mode 3: Enter Certificate ID */}
          {activeTab === 'manual' && (
            <div style={{ padding: '0.5rem 0' }}>
              <div className="form-group">
                <label className="form-label">Certificate ID</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. CERT-MH-001-0001"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleVerifyCertId(manualInput);
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.35rem', display: 'block' }}>
                  Enter full alphanumeric certificate code from official physical stamp or PDF
                </span>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => handleVerifyCertId(manualInput)}
                disabled={verifying || !manualInput.trim()}
              >
                {verifying ? 'Verifying...' : 'Verify Certificate'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
