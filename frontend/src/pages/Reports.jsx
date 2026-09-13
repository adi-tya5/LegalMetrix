import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { DemoDisclaimer } from '../components/DemoDisclaimer';
import { ResponsiveTable } from '../components/ResponsiveTable';
import { SkeletonStats, SkeletonTable } from '../components/SkeletonLoader';
import { ArrowLeft, Download, BarChart3, Scale, ShieldCheck, AlertTriangle } from 'lucide-react';

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
      setInstruments(inst || []);
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
    link.setAttribute('download', `LegalMetrix_Compliance_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <SkeletonStats />
        <SkeletonTable rows={4} cols={5} />
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="page-header-block">
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
          <h1 className="page-main-title">Reports &amp; Verification Analytics</h1>
          <p className="page-sub-title">
            Periodic compliance audits, verification pass/fail trends, and registry data export
          </p>
        </div>

        <div className="page-actions-group">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleExportCsv}
          >
            <Download size={14} />
            <span>Export Compliance CSV</span>
          </button>
        </div>
      </div>

      <DemoDisclaimer />

      {/* Summary KPI Cards */}
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <span className="spec-label">Total Digital Assets Under Monitoring</span>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: '#0F2537', marginTop: '0.25rem' }}>
            {metrics?.total_instruments || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#007A64', marginTop: '0.25rem', fontWeight: '600' }}>
            100% Tracked on Continuous Lifecycle Ledger
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <span className="spec-label">Valid Certification Rate</span>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: '#10B981', marginTop: '0.25rem' }}>
            {metrics?.total_instruments ? Math.round((metrics.certificates_issued / metrics.total_instruments) * 100) : 0}%
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.25rem' }}>
            {metrics?.certificates_issued || 0} Active Sealed Certificates
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <span className="spec-label">Re-Verification Required Queue</span>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: '#EF4444', marginTop: '0.25rem' }}>
            {(metrics?.expired_instruments || 0) + (metrics?.reverification_required || 0)}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.25rem' }}>
            Expired or Tolerance-Exceeded Devices
          </div>
        </div>
      </div>

      {/* Register Preview with Responsive Table */}
      <div className="section-card">
        <div className="section-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={18} className="text-teal" />
            <h3 className="section-card-title">Compliance Verification Register ({instruments.length})</h3>
          </div>
        </div>

        <ResponsiveTable
          columns={[
            {
              key: 'instrument_uid',
              label: 'Instrument UID',
              render: (row) => (
                <span style={{ fontWeight: '700', fontFamily: 'monospace', color: '#0F2537' }}>
                  {row.instrument_uid}
                </span>
              )
            },
            {
              key: 'type',
              label: 'Type & Category',
              render: (row) => (
                <div>
                  <strong>{row.instrument_type}</strong>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{row.category}</div>
                </div>
              )
            },
            {
              key: 'serial',
              label: 'Serial / Model',
              render: (row) => (
                <div>
                  <span className="font-mono">{row.serial_number}</span>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{row.manufacturer}</div>
                </div>
              )
            },
            {
              key: 'capacity',
              label: 'Capacity',
              render: (row) => `${row.max_capacity} ${row.unit}`
            },
            {
              key: 'status',
              label: 'Status',
              render: (row) => <StatusBadge status={row.current_status} size="small" />
            }
          ]}
          data={instruments}
          emptyMessage="No instruments found in registry."
          renderMobileCard={(row) => (
            <div>
              <div className="mobile-card-header">
                <div>
                  <span className="mobile-card-title-label">Instrument</span>
                  <div className="mobile-card-title-val font-mono">{row.instrument_uid}</div>
                </div>
                <StatusBadge status={row.current_status} size="small" />
              </div>

              <div className="mobile-card-row">
                <span className="mobile-card-label">Type</span>
                <span className="mobile-card-val">{row.instrument_type}</span>
              </div>

              <div className="mobile-card-row">
                <span className="mobile-card-label">Serial Number</span>
                <span className="mobile-card-val font-mono">{row.serial_number}</span>
              </div>

              <div className="mobile-card-row">
                <span className="mobile-card-label">Capacity</span>
                <span className="mobile-card-val">{row.max_capacity} {row.unit}</span>
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
};
