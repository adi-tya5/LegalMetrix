import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { DemoDisclaimer } from '../components/DemoDisclaimer';

export const Reports = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState(null);
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiRequest('/reports/metrics'),
      apiRequest('/instruments/')
    ]).then(([m, inst]) => {
      setMetrics(m);
      setInstruments(inst);
    }).finally(() => setLoading(false));
  }, []);

  const handleExportCsv = () => {
    if (instruments.length === 0) return;
    const headers = ['Instrument UID', 'Type', 'Category', 'Manufacturer', 'Serial No', 'Max Capacity', 'Current Status'];
    const rows = instruments.map(i => [
      i.instrument_uid,
      `"${i.instrument_type}"`,
      i.category,
      `"${i.manufacturer}"`,
      i.serial_number,
      `${i.max_capacity} ${i.unit}`,
      i.current_status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LegalMetrix_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div style={{ padding: '2rem' }}>Generating Analytics &amp; Reports...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <button className="btn btn-outline btn-sm" onClick={() => onNavigate('dashboard')} style={{ marginBottom: '0.5rem' }}>
            &larr; Back to Dashboard
          </button>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0F2537' }}>
            Directorate Reports &amp; Verification Analytics
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.85rem' }}>
            Periodic compliance audits, verification pass/fail trends, and registry data export.
          </p>
        </div>

        <button className="btn btn-primary" onClick={handleExportCsv}>
          📊 Export Compliance CSV
        </button>
      </div>

      <DemoDisclaimer />

      {/* Summary KPI Cards */}
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
            Total Digital Assets Under Monitoring
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: '#0F2537', marginTop: '0.25rem' }}>
            {metrics?.total_instruments || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#007A64', marginTop: '0.25rem' }}>
            100% Tracked on Continuous Lifecycle Ledger
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
            Valid Certification Rate
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: '#10B981', marginTop: '0.25rem' }}>
            {metrics?.total_instruments ? Math.round((metrics.certificates_issued / metrics.total_instruments) * 100) : 0}%
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.25rem' }}>
            {metrics?.certificates_issued} Active Sealed Certificates
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
            Non-Compliance / Re-Verification Queue
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: '#EF4444', marginTop: '0.25rem' }}>
            {(metrics?.expired_instruments || 0) + (metrics?.reverification_required || 0)}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.25rem' }}>
            Expired or Tolerance-Exceeded Devices
          </div>
        </div>
      </div>

      {/* Instruments Export Preview Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <span>📋</span> Compliance Verification Register Preview
          </div>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Instrument UID</th>
                <th>Type &amp; Category</th>
                <th>Manufacturer</th>
                <th>Serial Number</th>
                <th>Capacity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {instruments.map(i => (
                <tr key={i.id}>
                  <td style={{ fontWeight: '700', fontFamily: 'monospace' }}>{i.instrument_uid}</td>
                  <td>{i.instrument_type} ({i.category})</td>
                  <td>{i.manufacturer}</td>
                  <td style={{ fontFamily: 'monospace' }}>{i.serial_number}</td>
                  <td>{i.max_capacity} {i.unit}</td>
                  <td><StatusBadge status={i.current_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
