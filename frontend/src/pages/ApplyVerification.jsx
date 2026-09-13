import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { DemoDisclaimer } from '../components/DemoDisclaimer';

export const ApplyVerification = ({ onNavigate }) => {
  const [instruments, setInstruments] = useState([]);
  const [selectedInstId, setSelectedInstId] = useState('');
  const [appType, setAppType] = useState('INITIAL');
  const [feeBreakdown, setFeeBreakdown] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiRequest('/instruments/').then(data => {
      setInstruments(data);
      if (data.length > 0) {
        setSelectedInstId(data[0].id);
      }
    }).catch(console.error);
  }, []);

  const handleFetchFee = async () => {
    if (!selectedInstId) return;
    setLoading(true);
    try {
      const res = await apiRequest('/payments/calculate', {
        method: 'POST',
        body: JSON.stringify({ instrument_id: parseInt(selectedInstId) })
      });
      setFeeBreakdown(res);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToPayment = async () => {
    setLoading(true);
    try {
      // Create application -> Enters PAYMENT_PENDING
      const res = await apiRequest('/applications/', {
        method: 'POST',
        body: JSON.stringify({
          instrument_id: parseInt(selectedInstId),
          application_type: appType
        })
      });
      onNavigate('mock-payment', res.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedInstrument = instruments.find(i => i.id === parseInt(selectedInstId));

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <button className="btn btn-outline btn-sm" onClick={() => onNavigate('dashboard')} style={{ marginBottom: '0.5rem' }}>
          &larr; Back to Dashboard
        </button>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0F2537' }}>
          Verification Application Wizard
        </h2>
        <p style={{ color: '#64748B', fontSize: '0.85rem' }}>
          Follow the 5-stage verification application procedure.
        </p>
      </div>

      <DemoDisclaimer />

      {error && (
        <div style={{ padding: '0.75rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Step Indicator */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 90px', padding: '0.5rem 0.6rem', background: step >= 1 ? '#007A64' : '#E2E8F0', color: step >= 1 ? 'white' : '#64748B', borderRadius: '6px', fontWeight: '600', fontSize: '0.78rem', textAlign: 'center' }}>
          1. Select Device
        </div>
        <div style={{ flex: '1 1 90px', padding: '0.5rem 0.6rem', background: step >= 2 ? '#007A64' : '#E2E8F0', color: step >= 2 ? 'white' : '#64748B', borderRadius: '6px', fontWeight: '600', fontSize: '0.78rem', textAlign: 'center' }}>
          2. Fee Breakdown
        </div>
        <div style={{ flex: '1 1 90px', padding: '0.5rem 0.6rem', background: '#E2E8F0', color: '#64748B', borderRadius: '6px', fontWeight: '600', fontSize: '0.78rem', textAlign: 'center' }}>
          3. Mock Payment
        </div>
      </div>

      {step === 1 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <span>⚖️</span> Select Registered Instrument
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Select Instrument</label>
            <select
              className="form-select"
              value={selectedInstId}
              onChange={(e) => setSelectedInstId(e.target.value)}
            >
              {instruments.map(inst => (
                <option key={inst.id} value={inst.id}>
                  {inst.instrument_uid} - {inst.instrument_type} (Serial: {inst.serial_number})
                </option>
              ))}
            </select>
          </div>

          {selectedInstrument && (
            <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
              <div><strong>Category:</strong> {selectedInstrument.category}</div>
              <div><strong>Manufacturer &amp; Model:</strong> {selectedInstrument.manufacturer} ({selectedInstrument.model_number})</div>
              <div><strong>Capacity:</strong> {selectedInstrument.max_capacity} {selectedInstrument.unit}</div>
              <div><strong>Location:</strong> {selectedInstrument.location_address}</div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Application Type</label>
            <select
              className="form-select"
              value={appType}
              onChange={(e) => setAppType(e.target.value)}
            >
              <option value="INITIAL">Initial Verification</option>
              <option value="RE_VERIFICATION">Periodic / Stamped Re-Verification</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleFetchFee} disabled={loading || !selectedInstId} style={{ width: '100%' }}>
              {loading ? 'Calculating Fee...' : 'Review Fee Breakdown &rarr;'}
            </button>
          </div>
        </div>
      )}

      {step === 2 && feeBreakdown && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <span>💳</span> Configurable Fee Engine Review
            </div>
          </div>

          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', color: '#166534', fontWeight: '600' }}>
                {feeBreakdown.component_name}
              </span>
              <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#007A64' }}>
                ₹{feeBreakdown.authoritative_amount.toFixed(2)}
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#15803D' }}>
              Instrument Category: <strong>{feeBreakdown.instrument_category}</strong> (Config Version: {feeBreakdown.version})
            </div>
            <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: '0.35rem', fontStyle: 'italic' }}>
              {feeBreakdown.source_disclaimer}
            </div>
          </div>

          <div style={{ fontSize: '0.825rem', color: '#64748B', marginBottom: '1.5rem' }}>
            <strong>Integrity Note:</strong> The backend strictly enforces this authoritative amount. Any client-side price tampering will be automatically rejected.
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn btn-outline" onClick={() => setStep(1)} style={{ minWidth: '90px' }}>
              &larr; Back
            </button>
            <button className="btn btn-primary" onClick={handleProceedToPayment} disabled={loading} style={{ flex: '1 1 auto' }}>
              {loading ? 'Generating Application...' : 'Proceed to Demo Payment &rarr;'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
