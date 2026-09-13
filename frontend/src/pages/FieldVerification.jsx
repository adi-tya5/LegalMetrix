import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { DemoDisclaimer } from '../components/DemoDisclaimer';
import { SkeletonCard } from '../components/SkeletonLoader';
import {
  Camera,
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Navigation,
  Scale,
  FileCheck,
  Shield,
  Trash2,
  RotateCcw,
  Check,
  MapPin,
  ClipboardList
} from 'lucide-react';

const EVIDENCE_CATEGORIES = [
  'Instrument Front View',
  'Display',
  'Serial/ID Plate',
  'Seal/Security Mark',
  'Test Setup',
  'Other'
];

export const FieldVerification = ({ verificationId, onNavigate }) => {
  const [activeVerId, setActiveVerId] = useState(verificationId || null);
  const [assignedApps, setAssignedApps] = useState([]);
  const [ver, setVer] = useState(null);
  const [inst, setInst] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [identityConfirmed, setIdentityConfirmed] = useState(true);
  const [physicalCondition, setPhysicalCondition] = useState('Good');
  const [sealCondition, setSealCondition] = useState('Intact');
  const [displayCondition, setDisplayCondition] = useState('Clear and Legible');
  const [remarks, setRemarks] = useState('');

  // Test Data
  const [refVal, setRefVal] = useState('1000');
  const [obsVal, setObsVal] = useState('1001.5');
  const [calcPreview, setCalcPreview] = useState(null);

  // Fail fields
  const [failureReason, setFailureReason] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');

  // GPS
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [accuracy, setAccuracy] = useState('');

  // Evidence upload
  const [evCategory, setEvCategory] = useState(EVIDENCE_CATEGORIES[0]);
  const [evDescription, setEvDescription] = useState('');
  const [evFile, setEvFile] = useState(null);
  const [uploadingEv, setUploadingEv] = useState(false);
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const loadDocket = async (targetId = null) => {
    setLoading(true);
    setError(null);
    try {
      let apps = [];
      try {
        apps = await apiRequest('/applications/');
        setAssignedApps(apps || []);
      } catch (err) {
        console.warn('Could not fetch applications list', err);
      }

      let chosenVerId = targetId || activeVerId || verificationId;

      if (!chosenVerId) {
        try {
          const activeVers = await apiRequest('/verifications/?active_only=true');
          if (activeVers && activeVers.length > 0) {
            chosenVerId = activeVers[0].id;
          }
        } catch (err) {
          console.warn('Could not fetch active verifications', err);
        }

        if (!chosenVerId && apps && apps.length > 0) {
          const scheduledApp = apps.find(a =>
            a.current_status === 'VERIFICATION_SCHEDULED' ||
            a.current_status === 'UNDER_VERIFICATION'
          ) || apps[0];

          if (scheduledApp) {
            const started = await apiRequest('/verifications/start', {
              method: 'POST',
              body: JSON.stringify({ application_id: scheduledApp.id })
            });
            chosenVerId = started.id;
          }
        }
      }

      if (!chosenVerId) {
        setVer(null);
        setInst(null);
        setLoading(false);
        return;
      }

      setActiveVerId(chosenVerId);
      const v = await apiRequest(`/verifications/${chosenVerId}`);
      setVer(v);

      const i = await apiRequest(`/instruments/${v.instrument_id}`);
      setInst(i);

      if (v.reference_value) setRefVal(v.reference_value.toString());
      if (v.observed_value) setObsVal(v.observed_value.toString());
      if (v.physical_condition) setPhysicalCondition(v.physical_condition);
      if (v.seal_condition) setSealCondition(v.seal_condition);
      if (v.display_condition) setDisplayCondition(v.display_condition);
      if (v.remarks) setRemarks(v.remarks);
      if (v.failure_reason) setFailureReason(v.failure_reason);
      if (v.corrective_action) setCorrectiveAction(v.corrective_action);
    } catch (err) {
      console.error(err);
      setError('Unable to load verification docket right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocket(verificationId || null);
  }, [verificationId]);

  const handleSelectApplication = async (appId) => {
    if (!appId) return;
    setLoading(true);
    setError(null);
    try {
      const started = await apiRequest('/verifications/start', {
        method: 'POST',
        body: JSON.stringify({ application_id: parseInt(appId) })
      });
      await loadDocket(started.id);
    } catch (err) {
      setError(err.message || 'Unable to switch docket');
      setLoading(false);
    }
  };

  // Real-time calculation preview
  useEffect(() => {
    if (!inst || !refVal || !obsVal) return;
    const r = parseFloat(refVal);
    const o = parseFloat(obsVal);
    if (isNaN(r) || isNaN(o) || r === 0) return;

    apiRequest('/verifications/preview-calc', {
      method: 'POST',
      body: JSON.stringify({
        instrument_type: inst.instrument_type,
        accuracy_class: inst.accuracy_class,
        test_parameter: 'Measurement Error',
        reference_value: r,
        observed_value: o
      })
    }).then(setCalcPreview).catch(console.error);
  }, [refVal, obsVal, inst]);

  const handleCaptureGps = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude.toFixed(6));
          setLng(pos.coords.longitude.toFixed(6));
          setAccuracy(pos.coords.accuracy.toFixed(1));
        },
        (err) => alert('GPS notice: ' + err.message + '. (GPS is optional and does not block verification)')
      );
    }
  };

  const handleEvidenceUpload = async (e) => {
    e.preventDefault();
    if (!evFile) {
      alert('Please select a photo or evidence document.');
      return;
    }
    if (!ver) return;

    setUploadingEv(true);
    try {
      const fd = new FormData();
      fd.append('verification_id', ver.id);
      fd.append('category', evCategory);
      fd.append('description', evDescription || '');
      if (lat) fd.append('latitude', lat);
      if (lng) fd.append('longitude', lng);
      fd.append('file', evFile);

      await apiRequest('/evidence/upload', {
        method: 'POST',
        body: fd
      });
      setEvFile(null);
      setEvDescription('');
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadDocket(ver.id);
    } catch (err) {
      alert(`Evidence upload failed: ${err.message}`);
    } finally {
      setUploadingEv(false);
    }
  };

  const handleDeleteEvidence = async (evId) => {
    if (!window.confirm('Delete this draft evidence photo?')) return;
    try {
      await apiRequest(`/evidence/${evId}`, { method: 'DELETE' });
      if (ver) loadDocket(ver.id);
    } catch (err) {
      alert(`Could not delete: ${err.message}`);
    }
  };

  const handleSubmitVerification = async (e) => {
    e.preventDefault();
    if (!ver || ver.is_submitted) return;

    const r = parseFloat(refVal);
    const o = parseFloat(obsVal);
    if (isNaN(r) || isNaN(o)) {
      alert('Please enter valid numerical reference and observed readings.');
      return;
    }

    if (calcPreview?.result === 'FAIL') {
      if (!failureReason.trim()) {
        alert('Failure reason is REQUIRED when verification result is FAIL!');
        return;
      }
      if (!correctiveAction.trim()) {
        alert('Corrective action is REQUIRED when verification result is FAIL!');
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        identity_confirmed: identityConfirmed,
        physical_condition: physicalCondition,
        seal_condition: sealCondition,
        display_condition: displayCondition,
        remarks: remarks,
        reference_value: r,
        observed_value: o,
        failure_reason: failureReason,
        corrective_action: correctiveAction,
        verification_lat: lat ? parseFloat(lat) : null,
        verification_lng: lng ? parseFloat(lng) : null,
        gps_accuracy: accuracy ? parseFloat(accuracy) : null
      };

      const res = await apiRequest(`/verifications/${ver.id}/submit`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.result === 'PASS') {
        alert(`Verification PASSED! Digital Certificate ${res.certificate_number} issued with SHA-256 seal.`);
        onNavigate('certificate-detail', res.certificate_id);
      } else {
        alert('Verification FAILED. Application status set to RE_VERIFICATION_REQUIRED.');
        onNavigate('instrument-detail', res.instrument_id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container" style={{ maxWidth: '820px', margin: '0 auto' }}>
        <SkeletonCard rows={2} />
        <SkeletonCard rows={5} />
      </div>
    );
  }

  if (error && !ver) {
    return (
      <div className="dashboard-container" style={{ maxWidth: '820px', margin: '0 auto' }}>
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <AlertTriangle size={36} color="#DC2626" style={{ margin: '0 auto 1rem auto' }} />
          <h3>Unable to Load Verification Docket</h3>
          <p style={{ color: '#64748B', marginTop: '0.5rem' }}>{error}</p>
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
            <button className="btn btn-primary" onClick={() => loadDocket(activeVerId)}>Retry</button>
            <button className="btn btn-outline" onClick={() => onNavigate('dashboard')}>Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  if (!ver || !inst) {
    return (
      <div className="dashboard-container" style={{ maxWidth: '820px', margin: '0 auto' }}>
        <div className="card" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
          <ClipboardList size={48} color="#0F2537" style={{ margin: '0 auto 1rem auto' }} />
          <h3>No Assigned Verifications in Queue</h3>
          <p style={{ color: '#64748B', maxWidth: '450px', margin: '0.5rem auto 1.5rem auto' }}>
            There are currently no verification dockets assigned to your officer account in scheduled or active verification states.
          </p>
          <button className="btn btn-primary" onClick={() => onNavigate('dashboard')}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isSubmitted = ver.is_submitted;
  const isPass = calcPreview ? calcPreview.result === 'PASS' : true;

  return (
    <div className="dashboard-container mobile-first-container" style={{ maxWidth: '820px', margin: '0 auto' }}>
      {/* Top Header */}
      <div className="page-header-block">
        <div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => onNavigate('dashboard')}
            style={{ marginBottom: '0.5rem' }}
          >
            <ArrowLeft size={14} />
            <span>Back to Docket</span>
          </button>
          <h1 className="page-main-title">FIELD VERIFICATION</h1>
          <p className="page-sub-title">
            Application #{ver.application_number || `LM-APP-${ver.application_id}`} &bull; Docket #{ver.verification_number}
          </p>
        </div>

        <div className="page-actions-group">
          {isSubmitted ? (
            <span className="badge badge-valid">✓ SUBMITTED &amp; LOCKED</span>
          ) : (
            <span className="badge badge-active">● UNDER VERIFICATION</span>
          )}
        </div>
      </div>

      <DemoDisclaimer />

      {/* Switch Docket Dropdown if multiple assigned */}
      {assignedApps.length > 1 && (
        <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1.25rem', background: '#F8FAFC' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0F2537' }}>
              Switch Assigned Docket:
            </span>
            <select
              className="form-select"
              style={{ maxWidth: '100%', flex: '1 1 240px', fontSize: '0.85rem' }}
              value={ver.application_id || ''}
              onChange={(e) => handleSelectApplication(e.target.value)}
            >
              {assignedApps.map(a => (
                <option key={a.id} value={a.id}>
                  {a.application_number} — {a.instrument_type} ({a.current_status})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Top Instrument Identity Card */}
      <div className="card instrument-identity-card" style={{ borderLeft: '4px solid #007A64', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              INSTRUMENT IDENTITY
            </span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0F2537' }}>
              {inst.instrument_type}
            </h3>
          </div>
          <span className="badge badge-info font-mono">{inst.instrument_uid}</span>
        </div>

        <div className="grid-3" style={{ fontSize: '0.85rem', rowGap: '0.5rem' }}>
          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>Serial Number</span>
            <strong className="font-mono">{inst.serial_number}</strong>
          </div>
          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>Capacity &amp; Class</span>
            <strong>{inst.max_capacity} {inst.unit} ({inst.accuracy_class || 'Class III'})</strong>
          </div>
          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>Manufacturer</span>
            <strong>{inst.manufacturer} ({inst.model_number || 'Standard'})</strong>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmitVerification}>
        {/* ================= SECTION 1: INSTRUMENT DETAILS ================= */}
        <div className="section-card">
          <div className="section-card-header">
            <h3 className="section-card-title">1. Instrument Details</h3>
          </div>
          <div className="grid-2" style={{ fontSize: '0.85rem', gap: '1rem' }}>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Registered Owner</span>
              <strong>{inst.owner_name}</strong>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Installation Location</span>
              <span>{inst.location_address || 'On-site facility'}</span>
            </div>
          </div>
          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #E2E8F0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={identityConfirmed}
                onChange={(e) => setIdentityConfirmed(e.target.checked)}
                disabled={isSubmitted}
                style={{ width: '18px', height: '18px', accentColor: '#007A64' }}
              />
              <span>Instrument Physical Identity Confirmed (Serial Plate matches Application)</span>
            </label>
          </div>
        </div>

        {/* ================= SECTION 2: CONDITION & SEAL ================= */}
        <div className="section-card">
          <div className="section-card-header">
            <h3 className="section-card-title">2. Condition &amp; Seal Checklist</h3>
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Physical Structure</label>
              <select
                className="form-select"
                value={physicalCondition}
                onChange={(e) => setPhysicalCondition(e.target.value)}
                disabled={isSubmitted}
              >
                <option value="Good">Good - No Damage</option>
                <option value="Minor Wear">Minor Wear / Acceptable</option>
                <option value="Damaged">Damaged / Defective</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Security Seal / Mark</label>
              <select
                className="form-select"
                value={sealCondition}
                onChange={(e) => setSealCondition(e.target.value)}
                disabled={isSubmitted}
              >
                <option value="Intact">Intact - Valid Seal</option>
                <option value="Tampered">Tampered / Broken Seal</option>
                <option value="Missing">Seal Missing / Resealing Needed</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Digital Display / Scale</label>
              <select
                className="form-select"
                value={displayCondition}
                onChange={(e) => setDisplayCondition(e.target.value)}
                disabled={isSubmitted}
              >
                <option value="Clear and Legible">Clear and Legible</option>
                <option value="Flickering">Flickering / Segment Failure</option>
                <option value="Unreadable">Unreadable / Obscured</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Officer Inspection Remarks</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Notes on environment, temperature, standard weight IDs, or test condition..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              disabled={isSubmitted}
            />
          </div>
        </div>

        {/* ================= SECTION 3: TEST READINGS & VISUAL CALCULATION ================= */}
        <div className="section-card">
          <div className="section-card-header">
            <h3 className="section-card-title">3. Test Readings &amp; Error Calculation</h3>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">
                Reference Value (Standard Calibrated Weight)
              </label>
              <input
                type="number"
                step="any"
                inputMode="decimal"
                className="form-input"
                value={refVal}
                onChange={(e) => setRefVal(e.target.value)}
                required
                disabled={isSubmitted}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Observed Value (Instrument Display Reading)
              </label>
              <input
                type="number"
                step="any"
                inputMode="decimal"
                className="form-input"
                value={obsVal}
                onChange={(e) => setObsVal(e.target.value)}
                required
                disabled={isSubmitted}
              />
            </div>
          </div>

          {/* Visually Understandable Calculation Panel */}
          {calcPreview && (
            <div className={`verification-calc-box ${calcPreview.result === 'PASS' ? 'calc-pass' : 'calc-fail'}`}>
              <div className="calc-summary-grid">
                <div className="calc-stat-unit">
                  <span className="calc-stat-label">Reference Value</span>
                  <span className="calc-stat-num font-mono">{refVal}</span>
                </div>

                <div className="calc-stat-unit">
                  <span className="calc-stat-label">Observed Value</span>
                  <span className="calc-stat-num font-mono">{obsVal}</span>
                </div>

                <div className="calc-stat-unit">
                  <span className="calc-stat-label">Measurement Error</span>
                  <span className={`calc-stat-num font-mono ${calcPreview.result === 'PASS' ? 'text-teal' : 'text-danger'}`}>
                    {calcPreview.percentage_error > 0 ? '+' : ''}{calcPreview.percentage_error.toFixed(2)}%
                  </span>
                </div>

                <div className="calc-stat-unit">
                  <span className="calc-stat-label">Applicable Limit</span>
                  <span className="calc-stat-num font-mono">
                    ±{calcPreview.permissible_limit_value.toFixed(2)}%
                  </span>
                </div>
              </div>

              <div className="calc-rule-footer">
                <span>Rule: <strong>{calcPreview.applied_rule_id}</strong> (v{calcPreview.applied_rule_version})</span>
                <span>Delta Error: {calcPreview.error_value > 0 ? '+' : ''}{calcPreview.error_value}</span>
              </div>
            </div>
          )}
        </div>

        {/* ================= SECTION 4: EVIDENCE (LARGE TOUCH PHOTO BUTTONS) ================= */}
        <div className="section-card">
          <div className="section-card-header">
            <div>
              <h3 className="section-card-title">4. Evidence Photos</h3>
              <p className="section-card-sub">Capture field instrument photos, serial plates, and calibration test setup</p>
            </div>
            <span className="badge badge-info">{ver.evidences?.length || 0} Attached</span>
          </div>

          {!isSubmitted && (
            <div className="evidence-action-box">
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Select Photo Category</label>
                <select
                  className="form-select"
                  value={evCategory}
                  onChange={(e) => setEvCategory(e.target.value)}
                >
                  {EVIDENCE_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Large touch targets for Capture & Upload */}
              <div className="touch-buttons-grid">
                <button
                  type="button"
                  className="btn btn-navy touch-btn"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera size={20} />
                  <span>Capture Photo</span>
                </button>

                <button
                  type="button"
                  className="btn btn-outline touch-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={20} />
                  <span>Upload Photo</span>
                </button>

                {/* Hidden native inputs */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setEvFile(e.target.files[0]);
                    }
                  }}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setEvFile(e.target.files[0]);
                    }
                  }}
                />
              </div>

              {evFile && (
                <div className="evidence-file-ready">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={16} className="text-teal" />
                    <span>Selected: <strong>{evFile.name}</strong> ({(evFile.size / 1024).toFixed(1)} KB)</span>
                  </div>

                  <div style={{ marginTop: '0.75rem' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Optional caption or test weight notes..."
                      value={evDescription}
                      onChange={(e) => setEvDescription(e.target.value)}
                      style={{ marginBottom: '0.5rem' }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={handleEvidenceUpload}
                        disabled={uploadingEv}
                      >
                        {uploadingEv ? 'Uploading...' : 'Confirm Upload'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => setEvFile(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Evidence photo thumbnails / cards */}
          <div className="evidence-list-wrap">
            {(!ver.evidences || ver.evidences.length === 0) ? (
              <p style={{ color: '#94A3B8', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>
                No inspection photos attached yet.
              </p>
            ) : (
              ver.evidences.map(ev => (
                <div key={ev.id} className="evidence-item-card">
                  <div className="evidence-meta">
                    <span className="evidence-category-pill">{ev.category}</span>
                    <span className="evidence-filename">{ev.filename}</span>
                    {ev.description && <span className="evidence-desc">{ev.description}</span>}
                  </div>
                  {!isSubmitted && (
                    <button
                      type="button"
                      className="evidence-delete-btn"
                      onClick={() => handleDeleteEvidence(ev.id)}
                      title="Delete photo"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ================= SECTION 5: GPS (OPTIONAL) ================= */}
        <div className="section-card">
          <div className="section-card-header">
            <div>
              <h3 className="section-card-title">5. Field Geolocation (Optional)</h3>
              <p className="section-card-sub">Strictly optional; public QR views redact all coordinates</p>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleCaptureGps}
              disabled={isSubmitted}
            >
              <Navigation size={13} />
              <span>Capture GPS</span>
            </button>
          </div>

          <div className="grid-3" style={{ fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>Latitude</span>
              <strong>{lat || ver.verification_lat || 'Not recorded'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>Longitude</span>
              <strong>{lng || ver.verification_lng || 'Not recorded'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>Accuracy</span>
              <strong>{accuracy ? `±${accuracy}m` : (ver.gps_accuracy ? `±${ver.gps_accuracy}m` : 'N/A')}</strong>
            </div>
          </div>
        </div>

        {/* ================= SECTION 6: RESULT (PASS / FAIL) ================= */}
        <div className="section-card">
          <div className="section-card-header">
            <h3 className="section-card-title">6. Metrological Result</h3>
          </div>

          <div className={`verification-result-display ${calcPreview?.result === 'FAIL' ? 'result-fail' : 'result-pass'}`}>
            <div className="result-icon-box">
              {calcPreview?.result === 'FAIL' ? (
                <XCircle size={36} strokeWidth={2.5} />
              ) : (
                <CheckCircle2 size={36} strokeWidth={2.5} />
              )}
            </div>
            <div className="result-text-box">
              <span className="result-headline">RESULT</span>
              <h2 className="result-state">
                {calcPreview?.result === 'FAIL' ? 'FAIL' : 'PASS'}
              </h2>
              <span className="result-subtext">
                {calcPreview?.result === 'FAIL'
                  ? 'Error exceeds permissible statutory tolerance limit.'
                  : 'All measurements conform within statutory tolerance.'}
              </span>
            </div>
          </div>

          {/* If FAIL, immediately show required failure reason & corrective action */}
          {calcPreview?.result === 'FAIL' && (
            <div className="fail-defects-block">
              <div className="fail-defects-title">
                <AlertTriangle size={18} />
                <span>Mandatory Defect Reporting (Required for FAIL)</span>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: '#991B1B' }}>
                  Failure Reason (Required)*
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Error exceeded ±0.50% permissible limit; load cell drift detected"
                  value={failureReason}
                  onChange={(e) => setFailureReason(e.target.value)}
                  required
                  disabled={isSubmitted}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ color: '#991B1B' }}>
                  Corrective Action for Instrument Owner (Required)*
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Recalibrate instrument transducer and submit re-verification application"
                  value={correctiveAction}
                  onChange={(e) => setCorrectiveAction(e.target.value)}
                  required
                  disabled={isSubmitted}
                />
              </div>
            </div>
          )}
        </div>

        {/* ================= SECTION 7: SUBMIT VERIFICATION ================= */}
        {!isSubmitted && (
          <div className="section-card submit-section-card">
            <div className="submit-action-row">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => onNavigate('dashboard')}
              >
                Cancel
              </button>

              <button
                type="submit"
                className={`btn ${calcPreview?.result === 'FAIL' ? 'btn-danger' : 'btn-primary'} submit-main-btn`}
                disabled={submitting}
              >
                {submitting ? (
                  'Submitting Docket...'
                ) : calcPreview?.result === 'FAIL' ? (
                  <>
                    <XCircle size={16} />
                    <span>Submit for Re-verification (Result: FAIL)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Submit Verification &amp; Issue Certificate</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
