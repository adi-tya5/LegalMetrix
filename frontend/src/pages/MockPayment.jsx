import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { WorkflowTracker } from '../components/WorkflowTracker';
import { DemoDisclaimer } from '../components/DemoDisclaimer';

export const MockPayment = ({ applicationId, onNavigate }) => {
  const [app, setApp] = useState(null);
  const [method, setMethod] = useState('DEMO_UPI');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [tamperedAmount, setTamperedAmount] = useState('');
  const [enableTamperTest, setEnableTamperTest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);

  useEffect(() => {
    apiRequest(`/applications/${applicationId}`)
      .then(data => {
        setApp(data);
        setTamperedAmount('10.0'); // Pre-fill test tampering with ₹10
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [applicationId]);

  const handlePay = async () => {
    setProcessing(true);
    setError(null);
    try {
      const payload = {
        application_id: parseInt(applicationId),
        payment_method: method,
        simulate_failure: simulateFailure,
        // If user enabled tampering test, send the manipulated client amount
        submitted_amount: enableTamperTest ? parseFloat(tamperedAmount) : app.fee_amount
      };

      const res = await apiRequest('/payments/process', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setPaymentResult(res);
      // Reload app
      const updated = await apiRequest(`/applications/${applicationId}`);
      setApp(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading payment screen...</div>;
  if (!app) return <div style={{ padding: '2rem', color: '#DC2626' }}>Application not found</div>;

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <button className="btn btn-outline btn-sm" onClick={() => onNavigate('dashboard')} style={{ marginBottom: '0.5rem' }}>
          &larr; Back to Dashboard
        </button>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0F2537' }}>
          Payment Gateway (Demonstration)
        </h2>
        <p style={{ color: '#64748B', fontSize: '0.85rem' }}>
          Application Reference: <strong>{app.application_number}</strong> &bull; Instrument: <strong>{app.instrument_uid}</strong>
        </p>
      </div>

      <WorkflowTracker currentStatus={app.current_status} />

      <DemoDisclaimer customText="Demo Payment Simulation — No real bank transactions or statutory collections are performed. All currency displays are indicative." />

      {error && (
        <div style={{ padding: '0.75rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {paymentResult && (
        <div style={{
          padding: '1.25rem',
          backgroundColor: paymentResult.status === 'COMPLETED' ? '#ECFDF5' : '#FEF2F2',
          border: `1px solid ${paymentResult.status === 'COMPLETED' ? '#A7F3D0' : '#FECACA'}`,
          borderRadius: '8px',
          marginBottom: '1.5rem'
        }}>
          <div style={{ fontWeight: '800', fontSize: '1.1rem', color: paymentResult.status === 'COMPLETED' ? '#065F46' : '#991B1B' }}>
            {paymentResult.status === 'COMPLETED' ? '✓ Payment Successful' : '✕ Payment Failed (Simulated)'}
          </div>
          <div style={{ fontSize: '0.85rem', marginTop: '0.35rem', color: '#334155' }}>
            {paymentResult.message}
          </div>
          {paymentResult.status === 'COMPLETED' && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#047857' }}>
              <strong>Transaction Ref:</strong> {paymentResult.payment_reference}<br />
              <strong>Authoritative Amount Enforced:</strong> ₹{paymentResult.amount_paid.toFixed(2)}<br />
              <strong>Next Workflow Stage:</strong> SUBMITTED (Queued for Admin Allocation)
            </div>
          )}
          <div style={{ marginTop: '1rem' }}>
            <button className="btn btn-primary btn-sm" onClick={() => onNavigate('dashboard')}>
              Return to Dashboard
            </button>
          </div>
        </div>
      )}

      {app.current_status === 'PAYMENT_PENDING' && !paymentResult && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <span>💳</span> Complete Application Payment
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#007A64' }}>
              ₹{app.fee_amount.toFixed(2)}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Select Demo Payment Method</label>
            <select className="form-select" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="DEMO_UPI">Demo UPI (GPay / PhonePe / BHIM)</option>
              <option value="DEMO_NETBANKING">Demo Net Banking (State Bank / HDFC)</option>
              <option value="DEMO_CARD">Demo Corporate Debit / Credit Card</option>
            </select>
          </div>

          {/* Test Case 4 Validation Switcher in UI */}
          <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0F2537', marginBottom: '0.5rem' }}>
              SIH Test Case 4: Client-Side Tamper Resistance Test
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem', color: '#475569', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={enableTamperTest}
                onChange={(e) => setEnableTamperTest(e.target.checked)}
              />
              Simulate manipulated frontend amount (e.g. attempt to pay ₹10 instead of ₹{app.fee_amount})
            </label>
            {enableTamperTest && (
              <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#DC2626' }}>Tampered payload:</span>
                <input
                  type="number"
                  className="form-input"
                  style={{ width: '120px', padding: '0.35rem 0.5rem' }}
                  value={tamperedAmount}
                  onChange={(e) => setTamperedAmount(e.target.value)}
                />
                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>(Backend will reject &amp; enforce ₹{app.fee_amount})</span>
              </div>
            )}
          </div>

          {/* Simulation Toggle for Failure */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem', color: '#64748B', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={simulateFailure}
                onChange={(e) => setSimulateFailure(e.target.checked)}
              />
              Simulate Payment Failure (Application will remain in PAYMENT_PENDING)
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => onNavigate('dashboard')}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePay}
              disabled={processing}
            >
              {processing ? 'Processing Demo Transaction...' : `Pay ₹${app.fee_amount.toFixed(2)} (Demo)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
