import React, { useState, useEffect } from 'react';
import { apiRequest, downloadCertificatePdf } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { DemoDisclaimer } from '../components/DemoDisclaimer';
import { ResponsiveTable } from '../components/ResponsiveTable';
import { SkeletonCard, SkeletonTable } from '../components/SkeletonLoader';
import {
  ArrowLeft,
  Scale,
  FileText,
  History,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Download,
  Calendar,
  Layers,
  ArrowRight,
  MapPin,
  Building,
  Hash
} from 'lucide-react';

export const InstrumentDetail = ({ instrumentId, onNavigate }) => {
  const [instrument, setInstrument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'applications' | 'history' | 'certificates'

  const loadDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest(`/instruments/${instrumentId}`);
      setInstrument(data);
    } catch (err) {
      console.error(err);
      setError('Unable to load instrument profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (instrumentId) {
      loadDetail();
    }
  }, [instrumentId]);

  const handleStartReverification = async () => {
    try {
      const res = await apiRequest('/reverification/start', {
        method: 'POST',
        body: JSON.stringify({
          instrument_id: instrument.id,
          notes: 'Statutory re-verification cycle initiated'
        })
      });
      alert(`Re-Verification application ${res.application_number} submitted! Permanent history preserved.`);
      loadDetail();
    } catch (err) {
      alert(`Failed to start re-verification: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <SkeletonCard rows={2} />
        <SkeletonCard rows={4} />
      </div>
    );
  }

  if (error || !instrument) {
    return (
      <div className="dashboard-container">
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <AlertTriangle size={36} color="#DC2626" style={{ margin: '0 auto 1rem auto' }} />
          <h3>Error Loading Instrument</h3>
          <p style={{ color: '#64748B', marginTop: '0.5rem' }}>{error || 'Instrument not found'}</p>
          <button className="btn btn-primary" onClick={() => onNavigate('dashboard')} style={{ marginTop: '1rem' }}>
            &larr; Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const needsReverification = ['EXPIRING_SOON', 'EXPIRED', 'RE_VERIFICATION_REQUIRED'].includes(instrument.current_status);
  const latestCert = instrument.latest_certificate;
  const latestVerification = instrument.verification_history?.[0] || null;

  return (
    <div className="dashboard-container">
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
            <span>Back to Dashboard</span>
          </button>
          <h1 className="page-main-title">
            {instrument.instrument_type || 'Instrument'}: {instrument.instrument_uid}
          </h1>
          <p className="page-sub-title">
            Permanent Metrological Identity &bull; One Instrument Connected to Complete Lifetime Verification History
          </p>
        </div>

        <div className="page-actions-group">
          <StatusBadge status={instrument.current_status} />
          {needsReverification && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleStartReverification}
            >
              <RotateCcw size={15} />
              <span>Start Re-Verification</span>
            </button>
          )}
        </div>
      </div>

      <DemoDisclaimer />

      {/* 1. CONNECTED LIFECYCLE PIPELINE BANNER (INSTRUMENT -> APPLICATIONS -> VERIFICATION HISTORY -> CERTIFICATES -> VALIDITY) */}
      <div className="instrument-flow-card">
        <div className="flow-card-title">
          <span>Metrological Compliance Journey</span>
        </div>
        <div className="instrument-flow-stepper">
          <div className="flow-step completed">
            <span className="flow-node">1</span>
            <div className="flow-text">
              <strong>INSTRUMENT</strong>
              <span>Registered UID</span>
            </div>
          </div>
          <div className="flow-arrow">&rarr;</div>

          <div className={`flow-step ${instrument.applications?.length > 0 ? 'completed' : 'active'}`}>
            <span className="flow-node">2</span>
            <div className="flow-text">
              <strong>APPLICATIONS</strong>
              <span>{instrument.applications?.length || 0} Cycles</span>
            </div>
          </div>
          <div className="flow-arrow">&rarr;</div>

          <div className={`flow-step ${instrument.verification_history?.length > 0 ? 'completed' : 'upcoming'}`}>
            <span className="flow-node">3</span>
            <div className="flow-text">
              <strong>VERIFICATION</strong>
              <span>{instrument.verification_history?.length || 0} Tests</span>
            </div>
          </div>
          <div className="flow-arrow">&rarr;</div>

          <div className={`flow-step ${instrument.certificate_history?.length > 0 ? 'completed' : 'upcoming'}`}>
            <span className="flow-node">4</span>
            <div className="flow-text">
              <strong>CERTIFICATES</strong>
              <span>{instrument.certificate_history?.length || 0} Issued</span>
            </div>
          </div>
          <div className="flow-arrow">&rarr;</div>

          <div className={`flow-step ${instrument.current_status === 'VALID' ? 'completed' : 'active'}`}>
            <span className="flow-node">5</span>
            <div className="flow-text">
              <strong>VALIDITY</strong>
              <span>{instrument.current_status.replace(/_/g, ' ')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. INSTRUMENT IDENTITY SPECIFICATION CARD */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card-header" style={{ marginBottom: '1rem', paddingBottom: '0.75rem' }}>
          <div className="card-title">
            <Scale size={18} className="text-teal" />
            <span>Metrological Identity &amp; Status Overview</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Validity:</span>
            <StatusBadge status={instrument.current_status} size="small" />
          </div>
        </div>

        <div className="grid-3" style={{ rowGap: '1rem' }}>
          <div className="spec-item">
            <span className="spec-label">Instrument Name &amp; Type</span>
            <span className="spec-val primary">{instrument.instrument_type}</span>
            <span className="spec-sub">{instrument.category}</span>
          </div>

          <div className="spec-item">
            <span className="spec-label">Serial Number</span>
            <span className="spec-val font-mono">{instrument.serial_number}</span>
            <span className="spec-sub">Model: {instrument.model_number || 'Standard'}</span>
          </div>

          <div className="spec-item">
            <span className="spec-label">Capacity &amp; Class</span>
            <span className="spec-val">{instrument.max_capacity} {instrument.unit}</span>
            <span className="spec-sub">Accuracy: {instrument.accuracy_class || 'Class III'}</span>
          </div>

          <div className="spec-item">
            <span className="spec-label">Manufacturer</span>
            <span className="spec-val">{instrument.manufacturer}</span>
          </div>

          <div className="spec-item">
            <span className="spec-label">Latest Verification Status</span>
            <div style={{ marginTop: '0.2rem' }}>
              {latestVerification ? (
                <StatusBadge status={latestVerification.result} size="small" />
              ) : (
                <span style={{ color: '#94A3B8', fontSize: '0.85rem' }}>No Tests Recorded</span>
              )}
            </div>
          </div>

          <div className="spec-item">
            <span className="spec-label">Active Digital Certificate</span>
            <span className="spec-val" style={{ color: latestCert ? '#007A64' : '#64748B', fontFamily: latestCert ? 'monospace' : 'inherit' }}>
              {latestCert ? latestCert.certificate_number : 'None Currently Active'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. TABS: OVERVIEW | APPLICATIONS | VERIFICATION HISTORY | CERTIFICATES */}
      <div className="custom-tabs-container">
        <div className="custom-tabs-nav">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Building size={15} />
            <span>Overview</span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 'applications' ? 'active' : ''}`}
            onClick={() => setActiveTab('applications')}
          >
            <FileText size={15} />
            <span>Applications ({instrument.applications?.length || 0})</span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={15} />
            <span>Verification History ({instrument.verification_history?.length || 0})</span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 'certificates' ? 'active' : ''}`}
            onClick={() => setActiveTab('certificates')}
          >
            <ShieldCheck size={15} />
            <span>Certificates ({instrument.certificate_history?.length || 0})</span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="tab-content-card">
            <div className="grid-2" style={{ gap: '1.5rem' }}>
              <div className="card" style={{ marginBottom: 0 }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0F2537', marginBottom: '1rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.5rem' }}>
                  Registered Owner &amp; Installation Location
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
                  <div>
                    <span style={{ color: '#64748B', fontSize: '0.75rem', display: 'block' }}>Owner Name:</span>
                    <strong>{instrument.owner_name}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', fontSize: '0.75rem', display: 'block' }}>Installation Address:</span>
                    <span>{instrument.location_address || 'Registered Location'}</span>
                  </div>
                </div>
              </div>

              <div className="card" style={{ marginBottom: 0 }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0F2537', marginBottom: '1rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.5rem' }}>
                  Metrological Compliance Status
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748B' }}>Statutory Status:</span>
                    <StatusBadge status={instrument.current_status} size="small" />
                  </div>
                  {latestCert && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748B' }}>Certificate Valid Until:</span>
                        <strong style={{ color: '#B45309' }}>
                          {new Date(latestCert.expiry_date).toLocaleDateString()}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748B' }}>SHA-256 Fingerprint:</span>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#007A64' }}>
                          {latestCert.display_fingerprint}
                        </span>
                      </div>
                    </>
                  )}
                  {needsReverification && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm btn-block"
                        onClick={handleStartReverification}
                      >
                        Start Re-Verification Application
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: APPLICATIONS */}
        {activeTab === 'applications' && (
          <div className="tab-content-card">
            <ResponsiveTable
              columns={[
                {
                  key: 'application_number',
                  label: 'Application ID',
                  render: (row) => (
                    <span style={{ fontWeight: '700', fontFamily: 'monospace' }}>
                      {row.application_number}
                    </span>
                  )
                },
                {
                  key: 'application_type',
                  label: 'Type',
                  render: (row) => row.application_type
                },
                {
                  key: 'current_status',
                  label: 'Workflow Status',
                  render: (row) => <StatusBadge status={row.current_status} size="small" />
                },
                {
                  key: 'fee_amount',
                  label: 'Statutory Fee',
                  render: (row) => `₹${row.fee_amount} (${row.payment_status})`
                },
                {
                  key: 'assigned',
                  label: 'Assigned Officer',
                  render: (row) => row.assigned_verifier_name || 'Awaiting Allocation'
                },
                {
                  key: 'actions',
                  label: 'Action',
                  isAction: true,
                  render: (row) => (
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      {row.current_status === 'PAYMENT_PENDING' && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => onNavigate('mock-payment', row.id)}
                        >
                          Pay
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => onNavigate('dashboard')}
                      >
                        Track
                      </button>
                    </div>
                  )
                }
              ]}
              data={instrument.applications || []}
              emptyMessage="No verification applications filed for this instrument yet."
              renderMobileCard={(row) => (
                <div>
                  <div className="mobile-card-header">
                    <div>
                      <span className="mobile-card-title-label">Application</span>
                      <div className="mobile-card-title-val">{row.application_number}</div>
                    </div>
                    <StatusBadge status={row.current_status} size="small" />
                  </div>

                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Type</span>
                    <span className="mobile-card-val">{row.application_type}</span>
                  </div>

                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Fee</span>
                    <span className="mobile-card-val">₹{row.fee_amount} &bull; {row.payment_status}</span>
                  </div>

                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Officer</span>
                    <span className="mobile-card-val">{row.assigned_verifier_name || 'Pending'}</span>
                  </div>

                  <div className="mobile-card-actions">
                    {row.current_status === 'PAYMENT_PENDING' && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => onNavigate('mock-payment', row.id)}
                      >
                        Complete Payment
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => onNavigate('dashboard')}
                    >
                      Track
                    </button>
                  </div>
                </div>
              )}
            />
          </div>
        )}

        {/* TAB 3: VERIFICATION HISTORY */}
        {activeTab === 'history' && (
          <div className="tab-content-card">
            <ResponsiveTable
              columns={[
                {
                  key: 'verification_number',
                  label: 'Docket No',
                  render: (row) => (
                    <span style={{ fontWeight: '700', fontFamily: 'monospace' }}>
                      {row.verification_number}
                    </span>
                  )
                },
                {
                  key: 'verification_date',
                  label: 'Date',
                  render: (row) => new Date(row.verification_date).toLocaleDateString()
                },
                {
                  key: 'verifier',
                  label: 'Authority',
                  render: (row) => (
                    <div>
                      <strong>{row.verifier_name}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{row.verifier_role}</div>
                    </div>
                  )
                },
                {
                  key: 'readings',
                  label: 'Ref / Observed',
                  render: (row) => `${row.reference_value} / ${row.observed_value}`
                },
                {
                  key: 'error',
                  label: 'Error',
                  render: (row) => (
                    <strong style={{ color: (row.percentage_error > 0.5 ? '#DC2626' : '#007A64') }}>
                      {row.percentage_error !== null ? `${row.percentage_error > 0 ? '+' : ''}${row.percentage_error.toFixed(2)}%` : '-'}
                    </strong>
                  )
                },
                {
                  key: 'applied_limit',
                  label: 'Limit',
                  render: (row) => `±${row.applied_limit || 0.50}%`
                },
                {
                  key: 'result',
                  label: 'Result',
                  render: (row) => <StatusBadge status={row.result} size="small" />
                },
                {
                  key: 'remarks',
                  label: 'Remarks / Defects',
                  render: (row) => row.result === 'FAIL' ? (
                    <div style={{ fontSize: '0.78rem', color: '#991B1B' }}>
                      <strong>Reason:</strong> {row.failure_reason}<br />
                      <strong>Action:</strong> {row.corrective_action}
                    </div>
                  ) : (
                    <span style={{ color: '#64748B', fontSize: '0.8rem' }}>Permissible tolerance met</span>
                  )
                }
              ]}
              data={instrument.verification_history || []}
              emptyMessage="No field or lab verification records logged yet."
              renderMobileCard={(row) => (
                <div>
                  <div className="mobile-card-header">
                    <div>
                      <span className="mobile-card-title-label">Verification Docket</span>
                      <div className="mobile-card-title-val">{row.verification_number}</div>
                    </div>
                    <StatusBadge status={row.result} size="small" />
                  </div>

                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Date &amp; Officer</span>
                    <span className="mobile-card-val">
                      {new Date(row.verification_date).toLocaleDateString()} &bull; {row.verifier_name} ({row.verifier_role})
                    </span>
                  </div>

                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Readings (Ref / Obs)</span>
                    <span className="mobile-card-val">{row.reference_value} / {row.observed_value}</span>
                  </div>

                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Measurement Error</span>
                    <span className="mobile-card-val" style={{ fontWeight: '700', color: row.result === 'PASS' ? '#007A64' : '#DC2626' }}>
                      {row.percentage_error !== null ? `${row.percentage_error > 0 ? '+' : ''}${row.percentage_error.toFixed(2)}%` : '—'} (Limit: ±{row.applied_limit || 0.50}%)
                    </span>
                  </div>

                  {row.result === 'FAIL' && (
                    <div className="mobile-card-next-action-box" style={{ background: '#FFF1F2', borderColor: '#FDA4AF' }}>
                      <span className="next-action-micro-label" style={{ color: '#9F1239' }}>DEFECT REPORT</span>
                      <p style={{ color: '#881337', marginBottom: '0.2rem' }}><strong>Reason:</strong> {row.failure_reason}</p>
                      <p style={{ color: '#881337' }}><strong>Corrective Action:</strong> {row.corrective_action}</p>
                    </div>
                  )}
                </div>
              )}
            />
          </div>
        )}

        {/* TAB 4: CERTIFICATES */}
        {activeTab === 'certificates' && (
          <div className="tab-content-card">
            <ResponsiveTable
              columns={[
                {
                  key: 'certificate_number',
                  label: 'Certificate No',
                  render: (row) => (
                    <span style={{ fontWeight: '700', fontFamily: 'monospace', color: '#007A64' }}>
                      {row.certificate_number}
                    </span>
                  )
                },
                {
                  key: 'issue_date',
                  label: 'Issue Date',
                  render: (row) => new Date(row.issue_date).toLocaleDateString()
                },
                {
                  key: 'expiry_date',
                  label: 'Expiry Date',
                  render: (row) => (
                    <span style={{ color: '#B45309', fontWeight: '600' }}>
                      {new Date(row.expiry_date).toLocaleDateString()}
                    </span>
                  )
                },
                {
                  key: 'validity_status',
                  label: 'Status',
                  render: (row) => <StatusBadge status={row.validity_status} size="small" />
                },
                {
                  key: 'fingerprint',
                  label: 'SHA-256 Fingerprint',
                  render: (row) => (
                    <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#1E3A5F' }}>
                      {row.display_fingerprint}
                    </span>
                  )
                },
                {
                  key: 'actions',
                  label: 'Actions',
                  isAction: true,
                  render: (row) => (
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => onNavigate('certificate-detail', row.id)}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={async () => {
                          try {
                            await downloadCertificatePdf(row.id, row.certificate_number);
                          } catch (err) {
                            alert(`Download failed: ${err.message}`);
                          }
                        }}
                      >
                        <Download size={12} />
                        <span>PDF</span>
                      </button>
                    </div>
                  )
                }
              ]}
              data={instrument.certificate_history || []}
              emptyMessage="No digital certificates issued for this instrument yet."
              renderMobileCard={(row) => (
                <div>
                  <div className="mobile-card-header">
                    <div>
                      <span className="mobile-card-title-label">Certificate</span>
                      <div className="mobile-card-title-val" style={{ color: '#007A64' }}>{row.certificate_number}</div>
                    </div>
                    <StatusBadge status={row.validity_status} size="small" />
                  </div>

                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Issue &amp; Expiry</span>
                    <span className="mobile-card-val">
                      {new Date(row.issue_date).toLocaleDateString()} &rarr;{' '}
                      <strong style={{ color: '#B45309' }}>{new Date(row.expiry_date).toLocaleDateString()}</strong>
                    </span>
                  </div>

                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Fingerprint</span>
                    <span className="mobile-card-val font-mono" style={{ fontSize: '0.75rem' }}>
                      {row.display_fingerprint}
                    </span>
                  </div>

                  <div className="mobile-card-actions">
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => onNavigate('certificate-detail', row.id)}
                    >
                      View &amp; Verify
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={async () => {
                        try {
                          await downloadCertificatePdf(row.id, row.certificate_number);
                        } catch (err) {
                          alert(`Download failed: ${err.message}`);
                        }
                      }}
                    >
                      <Download size={13} />
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
};
