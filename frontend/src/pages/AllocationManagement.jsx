import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { DemoDisclaimer } from '../components/DemoDisclaimer';

export const AllocationManagement = ({ selectedAppId, onNavigate }) => {
  const [applications, setApplications] = useState([]);
  const [verifiers, setVerifiers] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [assignedRole, setAssignedRole] = useState('LMO');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [apps, vers] = await Promise.all([
        apiRequest('/applications/'),
        apiRequest('/users/verifiers')
      ]);
      setApplications(apps);
      setVerifiers(vers);

      if (selectedAppId) {
        const match = apps.find(a => a.id === parseInt(selectedAppId));
        if (match) {
          setSelectedApp(match);
        }
      } else if (apps.length > 0) {
        const pending = apps.find(a => a.current_status === 'SUBMITTED') || apps[0];
        setSelectedApp(pending);
      }

      // Default scheduled date tomorrow
      const d = new Date();
      d.setDate(d.getDate() + 1);
      setScheduledDate(d.toISOString().slice(0, 16));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedAppId]);

  // Filter verifiers by chosen role (LMO or GATC)
  const filteredVerifiers = verifiers.filter(v => v.role === assignedRole);

  useEffect(() => {
    if (filteredVerifiers.length > 0) {
      setAssignedUserId(filteredVerifiers[0].id);
    } else {
      setAssignedUserId('');
    }
  }, [assignedRole, verifiers]);

  const handleAllocate = async (e) => {
    e.preventDefault();
    if (!selectedApp) return;

    if (selectedApp.current_status === 'PAYMENT_PENDING') {
      alert('A payment-pending application cannot be allocated to an LMO or GATC!');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        assigned_role: assignedRole,
        assigned_user_id: parseInt(assignedUserId),
        scheduled_date: new Date(scheduledDate).toISOString(),
        notes: notes || 'Assigned via Directorate Allocation Desk'
      };

      const res = await apiRequest(`/assignments/${selectedApp.id}/allocate`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      alert(`Application ${res.application_number} successfully allocated to ${assignedRole} (${res.assigned_verifier_name})! Workflow state: VERIFICATION_SCHEDULED.`);
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading Allocation Desk...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <button className="btn btn-outline btn-sm" onClick={() => onNavigate('dashboard')} style={{ marginBottom: '0.5rem' }}>
            &larr; Back to Dashboard
          </button>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0F2537' }}>
            Verifier Allocation &amp; Inspection Scheduling
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.85rem' }}>
            Assign submitted applications to either Legal Metrology Officers (LMO) or Government Approved Test Centres (GATC).
          </p>
        </div>
      </div>

      <DemoDisclaimer />

      {error && (
        <div style={{ padding: '0.75rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <div className="grid-2">
        {/* Left: Applications List */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <span>📥</span> Application Queue
            </div>
            <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
              Select application to allocate
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '550px', overflowY: 'auto' }}>
            {applications.map(app => {
              const isSelected = selectedApp?.id === app.id;
              const isPending = app.current_status === 'SUBMITTED';
              return (
                <div
                  key={app.id}
                  onClick={() => setSelectedApp(app)}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    border: `1px solid ${isSelected ? '#007A64' : '#E2E8F0'}`,
                    backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', fontFamily: 'monospace' }}>{app.application_number}</span>
                    <StatusBadge status={app.current_status} />
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', marginTop: '0.25rem' }}>
                    {app.instrument_uid} &bull; {app.instrument_type}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.15rem' }}>
                    Applicant: {app.applicant_name} &bull; Fee Paid: ₹{app.fee_amount}
                  </div>
                  {app.assigned_verifier_name && (
                    <div style={{ fontSize: '0.75rem', color: '#007A64', marginTop: '0.35rem', fontWeight: '600' }}>
                      Currently Assigned: {app.assigned_verifier_name} ({app.assigned_role})
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Allocation & Scheduling Form */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <span>👥</span> Allocation &amp; Schedule Form
            </div>
          </div>

          {selectedApp ? (
            <form onSubmit={handleAllocate}>
              <div style={{ background: '#F8FAFC', padding: '0.85rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                <div><strong>Application:</strong> {selectedApp.application_number}</div>
                <div><strong>Instrument:</strong> {selectedApp.instrument_uid} ({selectedApp.instrument_type})</div>
                <div><strong>Applicant:</strong> {selectedApp.applicant_name}</div>
                <div><strong>Current Workflow State:</strong> <StatusBadge status={selectedApp.current_status} /></div>
                {selectedApp.current_status === 'PAYMENT_PENDING' && (
                  <div style={{ color: '#DC2626', marginTop: '0.5rem', fontWeight: 'bold' }}>
                    ⚠️ Payment is pending! Allocation is disabled until fee is received.
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Choose Verifier Authority Type</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="role"
                      value="LMO"
                      checked={assignedRole === 'LMO'}
                      onChange={() => setAssignedRole('LMO')}
                    />
                    <strong>LMO (Legal Metrology Officer)</strong>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="role"
                      value="GATC"
                      checked={assignedRole === 'GATC'}
                      onChange={() => setAssignedRole('GATC')}
                    />
                    <strong>GATC (Govt Approved Test Centre)</strong>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Select Designated {assignedRole}</label>
                <select
                  className="form-select"
                  value={assignedUserId}
                  onChange={(e) => setAssignedUserId(e.target.value)}
                  required
                >
                  {filteredVerifiers.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.full_name} - {v.organization || v.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Inspection Scheduled Date &amp; Time</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Docket Special Instructions / Notes</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="e.g. Standard calibration weights required; inspect security seal condition"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem' }}
                disabled={submitting || selectedApp.current_status === 'PAYMENT_PENDING'}
              >
                {submitting ? 'Allocating & Scheduling...' : `Assign to ${assignedRole} & Schedule Inspection`}
              </button>
            </form>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
              Select an application from the queue to allocate.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
