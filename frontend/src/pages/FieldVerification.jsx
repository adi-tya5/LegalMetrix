import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { DemoDisclaimer } from '../components/DemoDisclaimer';

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
      // 1. Fetch assigned applications for docket queue selector
      let apps = [];
      try {
        apps = await apiRequest('/applications/');
        setAssignedApps(apps || []);
      } catch (err) {
        console.warn('Could not fetch assigned applications list', err);
      }

      let chosenVerId = targetId || activeVerId || verificationId;

      if (!chosenVerId) {
        // Look for existing active verifications first
        try {
          const activeVers = await apiRequest('/verifications/?active_only=true');
          if (activeVers && activeVers.length > 0) {
            chosenVerId = activeVers[0].id;
          }
        } catch (err) {
          console.warn('Could not fetch active verifications', err);
        }

        // If still none, check assigned applications
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
        // No assigned verifications or applications available
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
      setError(err.message || 'Unable to load verification docket.');
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
        (err) => alert('GPS Capture notice: ' + err.message + '. (GPS is optional and does not block verification)')
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
        alert('failure_reason is REQUIRED when verification result is FAIL!');
        return;
      }
      if (!correctiveAction.trim()) {
        alert('corrective_action is REQUIRED when verification result is FAIL!');
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
        alert(`Verification PASSED! Digital Certificate ${res.certificate_number} generated with SHA-256 integrity seal.`);
        onNavigate('certificate-detail', res.certificate_id);
      } else {
        alert('Verification FAILED. Status set to RE_VERIFICATION_REQUIRED. Historical record created; user can now start re-verification.');
        onNavigate('instrument-detail', res.instrument_id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div style={{ maxWidth: '840px', margin: '2rem auto', textAlign: 'center', padding: '3rem' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
        <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0F2537' }}>
          Loading field verification docket...
        </div>
        <div style={{ fontSize: '0.875rem', color: '#64748B', marginTop: '0.5rem' }}>
          Querying assigned inspection queue and retrieving metrology configuration.
        </div>
      </div>
    );
  }

  // Error State with Retry
  if (error && !ver) {
    return (
      <div style={{ maxWidth: '840px', margin: '2rem auto', padding: '1rem' }}>
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', border: '1px solid #FECACA', background: '#FEF2F2' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚠️</div>
          <h3 style={{ color: '#991B1B', fontWeight: '800', marginBottom: '0.5rem' }}>
            Unable to load verification docket.
          </h3>
          <p style={{ color: '#7F1D1D', fontSize: '0.875rem', marginBottom: '1.5rem', maxWidth: '500px', margin: '0 auto 1.5rem auto' }}>
            {error}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button className="btn btn-primary btn-sm" onClick={() => loadDocket(activeVerId)}>
              🔄 Retry
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => onNavigate('dashboard')}>
              &larr; Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty State
  if (!ver || !inst) {
    return (
      <div style={{ maxWidth: '840px', margin: '2rem auto', padding: '1rem' }}>
        <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <h3 style={{ color: '#0F2537', fontWeight: '800', marginBottom: '0.5rem' }}>
            No assigned verifications currently available.
          </h3>
          <p style={{ color: '#64748B', fontSize: '0.875rem', maxWidth: '480px', margin: '0 auto 1.5rem auto' }}>
            There are currently no verification applications assigned to your docket queue in scheduled or active verification states.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button className="btn btn-primary btn-sm" onClick={() => loadDocket(null)}>
              🔄 Refresh Queue
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => onNavigate('dashboard')}>
              &larr; Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isSubmitted = ver.is_submitted;

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto' }}>
      {/* Docket Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <button className="btn btn-outline btn-sm" onClick={() => onNavigate('dashboard')} style={{ marginBottom: '0.5rem' }}>
            &larr; Back to Docket
          </button>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0F2537' }}>
            Verification Docket: {ver.verification_number}
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.85rem' }}>
            Officer: <strong>{ver.verifier_name}</strong> ({ver.verifier_role}) &bull; Date: {new Date(ver.verification_date).toLocaleDateString()}
          </p>
        </div>

        <div>
          {isSubmitted ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="badge badge-completed">SUBMITTED &amp; LOCKED</span>
              <StatusBadge status={ver.result} />
            </div>
          ) : (
            <span className="badge badge-active">UNDER VERIFICATION</span>
          )}
        </div>
      </div>

      <DemoDisclaimer />

      {/* Docket Selection Dropdown (if assigned applications exist) */}
      {assignedApps.length > 1 && (
        <div className="card" style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1rem' }}>📋</span>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1E293B' }}>
              Switch Assigned Docket:
            </span>
          </div>
          <select
            className="form-select"
            style={{ maxWidth: '440px', fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}
            value={ver.application_id || ''}
            onChange={(e) => handleSelectApplication(e.target.value)}
          >
            {assignedApps.map(a => (
              <option key={a.id} value={a.id}>
                {a.application_number} — {a.instrument?.instrument_type || 'Instrument'} ({a.instrument?.instrument_uid || 'UID'}) [{a.current_status}]
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <div style={{ padding: '0.75rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* 1. All 12 Required Metadata Fields */}
      <div className="card" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.5rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0F2537', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Docket Metadata &amp; Instrument Specifications
          </div>
          <span className="badge badge-active" style={{ fontSize: '0.75rem' }}>
            {ver.current_status || (ver.is_submitted ? 'COMPLETED' : 'UNDER_VERIFICATION')}
          </span>
        </div>

        <div className="grid-3" style={{ fontSize: '0.85rem', rowGap: '0.75rem' }}>
          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Application ID:</span>
            <strong>{ver.application_number || `APP-${ver.application_id}`}</strong>
          </div>
          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Instrument ID / UID:</span>
            <strong>{ver.instrument_uid || inst.instrument_uid}</strong>
          </div>
          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Instrument Type:</span>
            <strong>{ver.instrument_type || inst.instrument_type}</strong>
          </div>
          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Manufacturer:</span>
            <strong>{ver.manufacturer || inst.manufacturer || 'N/A'}</strong>
          </div>
          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Model Number:</span>
            <strong>{ver.model_number || inst.model_number || 'N/A'}</strong>
          </div>
          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Serial Number:</span>
            <strong>{ver.serial_number || inst.serial_number || 'N/A'}</strong>
          </div>
          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Max Capacity:</span>
            <strong>{ver.max_capacity || inst.max_capacity} {ver.unit || inst.unit}</strong>
          </div>
          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Accuracy Class:</span>
            <strong>{ver.accuracy_class || inst.accuracy_class || 'Class III'}</strong>
          </div>
          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Applicant / Owner:</span>
            <strong>{ver.applicant_name || 'Registered Owner'}</strong>
          </div>
          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Scheduled Date:</span>
            <strong>{ver.scheduled_date ? new Date(ver.scheduled_date).toLocaleDateString() : 'Immediate / On Demand'}</strong>
          </div>
          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Assigned Verifier:</span>
            <strong>{ver.verifier_name || 'Assigned Officer'} ({ver.verifier_role || 'LMO'})</strong>
          </div>
          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Workflow State:</span>
            <strong>{ver.current_status || (ver.is_submitted ? 'VERIFICATION_COMPLETED' : 'UNDER_VERIFICATION')}</strong>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmitVerification}>
        {/* 2. Physical Checklist */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <span>🔍</span> Inspection Checklist &amp; Physical Condition
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={identityConfirmed}
                  onChange={(e) => setIdentityConfirmed(e.target.checked)}
                  disabled={isSubmitted}
                />
                Instrument Identity Confirmed (Serial plate &amp; Model match)
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">Physical Structure Condition</label>
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
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Security Seal / Stamp Condition</label>
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
              <label className="form-label">Digital Display / Scale Readability</label>
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

          <div className="form-group">
            <label className="form-label">Inspection Remarks</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Officer inspection notes regarding testing environment and device setup"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              disabled={isSubmitted}
            />
          </div>
        </div>

        {/* 3. Measurement Test Data & Dynamic Calculation Engine */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <span>⚖️</span> Metrological Test Data &amp; Rules Engine Calculation
            </div>
            {calcPreview && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Calculated Result:</span>
                <StatusBadge status={calcPreview.result} />
              </div>
            )}
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Reference / True Value (Standard Calibrated Weight)</label>
              <input
                type="number"
                step="any"
                className="form-input"
                value={refVal}
                onChange={(e) => setRefVal(e.target.value)}
                required
                disabled={isSubmitted}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Observed / Indicated Value (Instrument Reading)</label>
              <input
                type="number"
                step="any"
                className="form-input"
                value={obsVal}
                onChange={(e) => setObsVal(e.target.value)}
                required
                disabled={isSubmitted}
              />
            </div>
          </div>

          {/* Real-time Calculation Panel */}
          {calcPreview && (
            <div style={{
              background: calcPreview.result === 'PASS' ? '#ECFDF5' : '#FEF2F2',
              border: `1px solid ${calcPreview.result === 'PASS' ? '#A7F3D0' : '#FECACA'}`,
              borderRadius: '8px',
              padding: '1.25rem',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: '600', textTransform: 'uppercase' }}>
                    Error Calculation
                  </span>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: calcPreview.result === 'PASS' ? '#065F46' : '#991B1B' }}>
                    Percentage Error: {calcPreview.percentage_error > 0 ? '+' : ''}{calcPreview.percentage_error.toFixed(2)}%
                    <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: '#475569', marginLeft: '0.5rem' }}>
                      (Δ = {calcPreview.error_value > 0 ? '+' : ''}{calcPreview.error_value})
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    Resolved Rule: <strong>{calcPreview.applied_rule_id}</strong> (v{calcPreview.applied_rule_version})
                  </div>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#0F2537' }}>
                    Permissible Tolerance: ±{calcPreview.permissible_limit_value.toFixed(2)}%
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#64748B', fontStyle: 'italic' }}>
                {calcPreview.disclaimer}
              </div>
            </div>
          )}

          {/* Mandatory Fail Fields (SIH Requirement: Required on FAIL) */}
          {calcPreview?.result === 'FAIL' && (
            <div style={{ background: '#FFF1F2', border: '1px solid #FDA4AF', padding: '1.25rem', borderRadius: '8px', marginTop: '1rem' }}>
              <div style={{ color: '#9F1239', fontWeight: '800', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                ⚠️ Verification Result is FAIL — Mandatory Defect Reporting:
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: '#9F1239' }}>
                  Failure Reason (REQUIRED)*
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Error exceeded ±0.50% demo limit; load cell drift detected"
                  value={failureReason}
                  onChange={(e) => setFailureReason(e.target.value)}
                  required={calcPreview?.result === 'FAIL'}
                  disabled={isSubmitted}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ color: '#9F1239' }}>
                  Corrective Action for Instrument Owner (REQUIRED)*
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Recalibrate instrument transducer and submit re-verification application within 14 days"
                  value={correctiveAction}
                  onChange={(e) => setCorrectiveAction(e.target.value)}
                  required={calcPreview?.result === 'FAIL'}
                  disabled={isSubmitted}
                />
              </div>
            </div>
          )}
        </div>

        {/* 4. Optional GPS Capture */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <span>📍</span> Optional Field Geolocation
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleCaptureGps}
              disabled={isSubmitted}
            >
              Capture Current GPS
            </button>
          </div>

          <div className="grid-3" style={{ fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: '#64748B' }}>Latitude:</span> <strong>{lat || ver.verification_lat || 'Not Captured'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>Longitude:</span> <strong>{lng || ver.verification_lng || 'Not Captured'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>Accuracy:</span> <strong>{accuracy || (ver.gps_accuracy ? `±${ver.gps_accuracy}m` : 'N/A')}</strong>
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.5rem' }}>
            GPS capture is optional and does not block verification. Public QR verification strictly redacts coordinates.
          </div>
        </div>

        {/* 5. Submit Verification Button */}
        {!isSubmitted && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginBottom: '2rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => onNavigate('dashboard')}>
              Cancel
            </button>
            <button
              type="submit"
              className={`btn ${calcPreview?.result === 'PASS' ? 'btn-primary' : 'btn-danger'}`}
              style={{ padding: '0.8rem 2rem', fontSize: '0.95rem' }}
              disabled={submitting}
            >
              {submitting ? 'Submitting Verification Docket...' : (
                calcPreview?.result === 'PASS' 
                  ? '✓ Submit Verification & Generate Digital Certificate' 
                  : '✕ Submit Failure Docket (Set RE_VERIFICATION_REQUIRED)'
              )}
            </button>
          </div>
        )}
      </form>

      {/* 6. Structured Evidence Section (Mutable before submission, locked after) */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <span>📷</span> Inspection Evidence &amp; Photos ({ver.evidences?.length || 0})
          </div>
          <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
            {isSubmitted ? '🔒 Evidence Permanently Locked (Immutable)' : 'Draft Evidence (Can add/remove before submission)'}
          </span>
        </div>

        {/* Upload form if not yet submitted */}
        {!isSubmitted && (
          <form onSubmit={handleEvidenceUpload} style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
            <div style={{ fontWeight: '700', fontSize: '0.85rem', marginBottom: '0.75rem', color: '#0F2537' }}>
              Upload Structured Evidence Photo / Document
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Category</label>
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

              <div className="form-group">
                <label className="form-label">Evidence Photo / Document</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => cameraInputRef.current?.click()}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: '600' }}
                  >
                    📷 Capture Photo
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: '600' }}
                  >
                    📁 Upload Photo
                  </button>
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
                {evFile ? (
                  <div style={{ fontSize: '0.8rem', color: '#007A64', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>✓ Ready: <strong>{evFile.name}</strong> ({(evFile.size / 1024).toFixed(1)} KB)</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEvFile(null);
                        if (cameraInputRef.current) cameraInputRef.current.value = '';
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}
                    >
                      ✕ Clear
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.35rem' }}>
                    Use rear camera to capture field instrument or upload document (.jpg, .png, .pdf).
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description / Caption</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Close-up of calibration weights on platform"
                value={evDescription}
                onChange={(e) => setEvDescription(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-navy btn-sm" disabled={uploadingEv}>
                {uploadingEv ? 'Uploading...' : 'Upload Evidence'}
              </button>
            </div>
          </form>
        )}

        {/* Evidence items list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {(!ver.evidences || ver.evidences.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94A3B8', fontSize: '0.85rem' }}>
              No evidence files attached yet.
            </div>
          ) : (
            ver.evidences.map(ev => (
              <div
                key={ev.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.65rem 1rem',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF'
                }}
              >
                <div>
                  <span style={{ fontWeight: '700', fontSize: '0.825rem', color: '#007A64' }}>
                    [{ev.category}]
                  </span>{' '}
                  <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>{ev.filename}</span>
                  {ev.description && (
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{ev.description}</div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                    {new Date(ev.uploaded_at).toLocaleTimeString()}
                  </span>
                  {!isSubmitted && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ color: '#DC2626', borderColor: '#FCA5A5' }}
                      onClick={() => handleDeleteEvidence(ev.id)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
