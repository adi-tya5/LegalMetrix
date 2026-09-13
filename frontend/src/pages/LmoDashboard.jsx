import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { DemoDisclaimer } from '../components/DemoDisclaimer';

export const LmoDashboard = ({ onNavigate, isGatc = false }) => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const roleTitle = isGatc ? 'Government Approved Test Centre (GATC)' : 'Legal Metrology Officer (LMO)';

  const loadAssigned = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/applications/');
      setApplications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssigned();
  }, []);

  const handleStartInspection = async (appId) => {
    try {
      const ver = await apiRequest('/verifications/start', {
        method: 'POST',
        body: JSON.stringify({ application_id: appId })
      });
      onNavigate('field-verification', ver.id);
    } catch (err) {
      alert(`Could not start inspection: ${err.message}`);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading assigned inspection docket...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0F2537' }}>
            {roleTitle} Inspection Docket
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.875rem' }}>
            Field inspection queue, verification scheduling, and digital test recording docket.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline btn-sm" onClick={loadAssigned}>
            🔄 Refresh Docket
          </button>
        </div>
      </div>

      <DemoDisclaimer />

      {/* Assigned Applications Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <span>📋</span> Assigned Field Verification Pipeline ({applications.length})
          </div>
          <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
            Official Field Verification Queue
          </span>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>App Number</th>
                <th>Instrument UID</th>
                <th>Instrument Type</th>
                <th>Scheduled Date</th>
                <th>Inspection Notes</th>
                <th>Current Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {applications.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8' }}>
                    No verification applications currently assigned to your docket.
                  </td>
                </tr>
              ) : (
                applications.map((app) => {
                  const canStart = ['VERIFICATION_SCHEDULED', 'UNDER_VERIFICATION', 'LMO_ASSIGNED'].includes(app.current_status);
                  return (
                    <tr key={app.id}>
                      <td style={{ fontWeight: '700', fontFamily: 'monospace' }}>{app.application_number}</td>
                      <td style={{ fontWeight: '600', color: '#007A64' }}>{app.instrument_uid}</td>
                      <td>{app.instrument_type}</td>
                      <td>
                        {app.scheduled_date ? new Date(app.scheduled_date).toLocaleDateString() : 'Pending Date'}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#64748B' }}>
                        {app.scheduled_notes || 'Standard testing protocol'}
                      </td>
                      <td><StatusBadge status={app.current_status} /></td>
                      <td>
                        {canStart ? (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleStartInspection(app.id)}
                          >
                            📱 Start Verification
                          </button>
                        ) : (
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => onNavigate('instrument-detail', app.instrument_id)}
                          >
                            View Record
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
