import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { apiRequest } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { DemoDisclaimer } from '../components/DemoDisclaimer';

/**
 * Extracts and validates a LegalMetrix certificate ID from scanned QR data.
 * Accepts:
 * - https://legalmetrix-sih.vercel.app/verify/CERT-MH-001-0005
 * - https://legalmetrix-qjt1.onrender.com/verify/CERT-MH-001-0005
 * - http://localhost:5173/verify/CERT-MH-001-0005
 * - /verify/CERT-MH-001-0005
 * - CERT-MH-001-0005 or CERT_MH_001_0005
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
  const [decodedRawText, setDecodedRawText] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);
  const [certData, setCertData] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Stop camera tracks cleanly
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

  // Request camera and run scan loop
  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    setCameraLoading(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser or requires a secure HTTPS connection.');
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
        videoRef.current.setAttribute('playsinline', 'true'); // Critical for iOS Safari
        await videoRef.current.play();
        setCameraActive(true);
        animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
      }
    } catch (err) {
      console.warn('Camera start error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera permissions in your browser settings to scan live QR codes.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device. You can upload a QR image or enter the Certificate ID below.');
      } else {
        setCameraError(`Unable to start camera (${err.message}). Try uploading a QR image instead.`);
      }
    } finally {
      setCameraLoading(false);
    }
  };

  // Real-time video frame QR scanning loop
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
      handleProcessQrCode(code.data);
      return;
    }

    if (streamRef.current) {
      animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
    }
  };

  // Automatically handle tab switching
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

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Process decoded QR text
  const handleProcessQrCode = async (rawCode) => {
    setError(null);
    setCertData(null);
    setDecodedRawText(rawCode);

    const certId = parseLegalMetrixQrCode(rawCode);
    if (!certId) {
      setError('Invalid LegalMetrix QR code.');
      return;
    }

    setVerifying(true);
    try {
      const data = await apiRequest(`/verify/${certId}`);
      setCertData(data);
    } catch (err) {
      if (err.status === 404) {
        setError('Certificate not found. Please ensure the QR code or Certificate ID is authentic.');
      } else {
        setError(err.message || 'Verification service encountered an error.');
      }
    } finally {
      setVerifying(false);
    }
  };

  // Upload image handling
  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setError(null);
    setCertData(null);
    setVerifying(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });

          if (code && code.data) {
            handleProcessQrCode(code.data);
          } else {
            setVerifying(false);
            setError('Invalid LegalMetrix QR code.');
          }
        } catch (canvasErr) {
          setVerifying(false);
          setError('Could not decode image. Please upload a clear, uncompressed image file.');
        }
      };

      img.onerror = () => {
        setVerifying(false);
        setError('Failed to process the uploaded image file.');
      };

      img.src = event.target.result;
    };
    reader.readAsDataURL(file);

    // Reset input so user can re-upload same file if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleProcessQrCode(manualInput.trim());
  };

  const handleResetScanner = () => {
    setCertData(null);
    setError(null);
    setDecodedRawText(null);
    setManualInput('');
    if (activeTab === 'camera') {
      startCamera();
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '1rem auto', padding: '0.75rem' }}>
      {/* Header Banner */}
      <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => onNavigate('dashboard')}
          style={{ marginBottom: '0.5rem' }}
        >
          &larr; Back to Portal
        </button>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0F2537' }}>
          Public QR Verification Scanner
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#64748B', maxWidth: '460px', margin: '0.25rem auto 0 auto' }}>
          Scan an official LegalMetrix QR code or upload a certificate image to verify live authenticity and cryptographic integrity.
        </p>
      </div>

      <DemoDisclaimer />

      {/* Main Scanner Card (only shown when no verified result yet) */}
      {!certData && (
        <div className="card" style={{ padding: '1.25rem' }}>
          {/* Scanner Mode Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '0.35rem',
              background: '#F1F5F9',
              padding: '0.35rem',
              borderRadius: '8px',
              marginBottom: '1.25rem',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'camera' ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: '1 1 120px', fontSize: '0.8rem', justifyContent: 'center' }}
              onClick={() => setActiveTab('camera')}
            >
              📷 Camera Scan
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'upload' ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: '1 1 120px', fontSize: '0.8rem', justifyContent: 'center' }}
              onClick={() => setActiveTab('upload')}
            >
              🖼️ Upload Image
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'manual' ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: '1 1 120px', fontSize: '0.8rem', justifyContent: 'center' }}
              onClick={() => setActiveTab('manual')}
            >
              ⌨️ Enter ID
            </button>
          </div>

          {/* TAB 1: Live Camera Viewfinder */}
          {activeTab === 'camera' && (
            <div style={{ textAlign: 'center' }}>
              <div
                className="scanner-viewfinder-container"
                style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: '380px',
                  height: '280px',
                  margin: '0 auto',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: '#0B1522',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <video
                  ref={videoRef}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: cameraActive ? 'block' : 'none',
                  }}
                  muted
                  playsInline
                />

                {cameraLoading && (
                  <div style={{ color: '#94A3B8', fontSize: '0.85rem', padding: '1rem' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
                    Initializing camera stream...
                  </div>
                )}

                {cameraError && (
                  <div style={{ color: '#FCA5A5', fontSize: '0.82rem', padding: '1.25rem', lineHeight: '1.4' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⚠️</div>
                    {cameraError}
                  </div>
                )}

                {/* Animated Targeting Reticle */}
                {cameraActive && (
                  <div
                    className="scanner-reticle"
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '190px',
                      height: '190px',
                      border: '2px solid #34D399',
                      borderRadius: '12px',
                      boxShadow: '0 0 0 4000px rgba(0, 0, 0, 0.4)',
                      pointerEvents: 'none',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '2px',
                        background: '#10B981',
                        boxShadow: '0 0 8px #10B981',
                        animation: 'scanner-laser 2s infinite ease-in-out',
                      }}
                    />
                  </div>
                )}
              </div>

              <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#64748B' }}>
                Position the QR code inside the green viewfinder box
              </div>

              {!cameraActive && !cameraLoading && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={startCamera}
                  style={{ marginTop: '0.5rem' }}
                >
                  🔄 Restart Camera
                </button>
              )}
            </div>
          )}

          {/* TAB 2: Upload QR Image */}
          {activeTab === 'upload' && (
            <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
              <div
                style={{
                  border: '2px dashed #CBD5E1',
                  borderRadius: '12px',
                  padding: '2rem 1rem',
                  background: '#F8FAFC',
                  cursor: 'pointer',
                }}
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🖼️</div>
                <div style={{ fontWeight: '700', color: '#0F2537', marginBottom: '0.25rem' }}>
                  Click to select QR Code Image
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                  Supports PNG, JPG, JPEG, WebP
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
          )}

          {/* TAB 3: Manual Input Fallback */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} style={{ padding: '0.5rem 0' }}>
              <div className="form-group">
                <label className="form-label">
                  Certificate Number or Public Verification URL
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. CERT-MH-001-0005"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  autoFocus
                />
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.25rem' }}>
                  Quick test demo ID: <code>CERT-MH-001-0005</code>
                </div>
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.5rem' }}
                disabled={!manualInput.trim() || verifying}
              >
                {verifying ? 'Verifying...' : '🔍 Verify Certificate'}
              </button>
            </form>
          )}

          {/* Verification Status Indicator */}
          {verifying && (
            <div style={{ textAlign: 'center', marginTop: '1rem', color: '#007A64', fontWeight: '700', fontSize: '0.85rem' }}>
              ⏳ Verifying cryptographic signature with LegalMetrix ledger...
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div
              style={{
                marginTop: '1.25rem',
                padding: '0.85rem 1rem',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
                borderRadius: '8px',
                fontSize: '0.85rem',
                textAlign: 'center',
              }}
            >
              <div style={{ fontWeight: '800', marginBottom: '0.25rem' }}>Verification Notice</div>
              <div>{error}</div>
              {decodedRawText && (
                <div style={{ fontSize: '0.7rem', color: '#7F1D1D', marginTop: '0.35rem', wordBreak: 'break-all' }}>
                  Scanned payload: <code>{decodedRawText}</code>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Verified Certificate Display (Privacy-Safe Public Result) */}
      {certData && (
        <div
          className="card"
          style={{
            border: '2px solid #007A64',
            padding: '1.25rem',
            boxShadow: '0 4px 12px rgba(0,122,100,0.1)',
          }}
        >
          {/* Status Header */}
          <div style={{ textAlign: 'center', paddingBottom: '1.25rem', borderBottom: '1px solid #E2E8F0', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              AUTHENTIC CERTIFICATE VERIFIED
            </div>
            <div style={{ fontSize: 'clamp(1.1rem, 5vw, 1.5rem)', fontWeight: '800', fontFamily: 'monospace', color: '#0F2537', wordBreak: 'break-all', marginTop: '0.25rem' }}>
              {certData.certificate_number}
            </div>
            <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <StatusBadge status={certData.validity_status} />
              <span className={`badge ${certData.integrity_status === 'VERIFIED' ? 'badge-valid' : 'badge-expired'}`}>
                ● {certData.integrity_status}
              </span>
            </div>
          </div>

          {/* Privacy-Safe Verification Details */}
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
          <div
            style={{
              marginTop: '1.5rem',
              background: '#F8FAFC',
              padding: '0.85rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              color: '#64748B',
              border: '1px solid #E2E8F0',
            }}
          >
            <strong>🔒 Privacy-Protected Public View:</strong> In accordance with SIH data privacy guidelines, owner personal contact details, physical GPS coordinates, and raw inspection evidence photos are strictly withheld on public verification endpoints.
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleResetScanner}
            >
              📷 Scan Another Code
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => onNavigate('dashboard')}
            >
              Return to Portal
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
