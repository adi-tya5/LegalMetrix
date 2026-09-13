import React, { useState } from 'react';
import { WorkflowTracker } from './WorkflowTracker';
import { StatusBadge } from './StatusBadge';
import {
  Compass,
  ArrowRight,
  CreditCard,
  Eye,
  FileCheck,
  RotateCcw,
  CheckCircle2,
  Clock,
  Layers
} from 'lucide-react';

/**
 * Returns user-friendly next action instructions based on workflow state.
 */
export function getNextActionInfo(app) {
  if (!app) return { text: 'No active application', label: 'Apply', action: 'apply' };

  switch (app.current_status) {
    case 'DRAFT':
      return {
        text: 'Complete and submit your application to start verification.',
        subtext: 'Your application is currently saved in draft state.',
        buttonLabel: 'Submit Application',
        buttonAction: 'submit',
        tone: 'info',
      };

    case 'PAYMENT_PENDING':
      return {
        text: 'Complete statutory fee payment to continue.',
        subtext: `Authoritative statutory fee: ₹${app.fee_amount}. Verification will not proceed until payment is cleared.`,
        buttonLabel: 'Complete Payment',
        buttonAction: 'pay',
        tone: 'warning',
      };

    case 'PAYMENT_COMPLETED':
    case 'SUBMITTED':
      return {
        text: 'Waiting for Directorate allocation.',
        subtext: 'Payment received. Application has entered the verification queue for officer/centre assignment.',
        buttonLabel: 'View Docket Status',
        buttonAction: 'details',
        tone: 'primary',
      };

    case 'LMO_ASSIGNED':
      return {
        text: `Assigned to ${app.assigned_verifier_name || 'Inspector'}. Awaiting schedule confirmation.`,
        subtext: 'The designated officer will specify the on-site or laboratory testing schedule.',
        buttonLabel: 'View Officer Details',
        buttonAction: 'details',
        tone: 'primary',
      };

    case 'VERIFICATION_SCHEDULED': {
      const dateStr = app.scheduled_date
        ? new Date(app.scheduled_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'Confirmed Date';
      return {
        text: `Verification scheduled for ${dateStr}.`,
        subtext: 'Ensure the instrument is accessible and test weights/standards are prepared on site.',
        buttonLabel: 'View Schedule Notes',
        buttonAction: 'details',
        tone: 'primary',
      };
    }

    case 'UNDER_VERIFICATION':
      return {
        text: 'LMO/GATC verification in progress.',
        subtext: 'Officer is currently performing metrological tests and capturing digital evidence.',
        buttonLabel: 'View Live Docket',
        buttonAction: 'details',
        tone: 'info',
      };

    case 'CERTIFICATE_ISSUED':
      return {
        text: 'Digital Certificate available & cryptographically sealed.',
        subtext: 'Your instrument is certified valid. QR verification code and official PDF are ready.',
        buttonLabel: 'View Certificate & PDF',
        buttonAction: 'certificate',
        tone: 'success',
      };

    case 'RE_VERIFICATION_REQUIRED':
      return {
        text: 'Corrective action required before re-verification.',
        subtext: 'Inspection failed statutory tolerance limits. Service device and initiate re-verification cycle.',
        buttonLabel: 'Start Re-Verification',
        buttonAction: 'reverify',
        tone: 'danger',
      };

    default:
      return {
        text: 'Application in progress.',
        subtext: 'Processing verification workflow.',
        buttonLabel: 'View Details',
        buttonAction: 'details',
        tone: 'info',
      };
  }
}

export const ApplicationTrackingCard = ({
  applications = [],
  selectedAppId = null,
  onSelectApp = null,
  onNavigate
}) => {
  if (!applications || applications.length === 0) {
    return (
      <div className="card app-tracking-hero-card">
        <div className="app-tracking-empty">
          <div className="app-tracking-empty-icon">
            <Compass size={36} strokeWidth={1.8} />
          </div>
          <div className="app-tracking-empty-text">
            <h3>No Active Applications Under Tracking</h3>
            <p>
              Register your weighing and measuring instruments and submit a verification application to start tracking its complete statutory lifecycle.
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => onNavigate('apply-verification')}
          >
            Apply for Verification &rarr;
          </button>
        </div>
      </div>
    );
  }

  // Active application to track (default to first or selected)
  const activeApp = applications.find(a => a.id === selectedAppId) || applications[0];
  const nextAction = getNextActionInfo(activeApp);

  const handleActionClick = () => {
    switch (nextAction.buttonAction) {
      case 'pay':
        onNavigate('mock-payment', activeApp.id);
        break;
      case 'certificate':
        onNavigate('instrument-detail', activeApp.instrument_id);
        break;
      case 'reverify':
        onNavigate('apply-verification', activeApp.instrument_id);
        break;
      case 'details':
      default:
        onNavigate('instrument-detail', activeApp.instrument_id);
        break;
    }
  };

  return (
    <div className="card app-tracking-hero-card">
      {/* Top Bar with Title & Multi-App Selector */}
      <div className="app-tracking-top-bar">
        <div className="app-tracking-title-wrap">
          <div className="app-tracking-tag">
            <Compass size={15} strokeWidth={2.4} />
            <span>APPLICATION TRACKING</span>
          </div>
          <h2 className="app-tracking-id">
            {activeApp.application_number}
          </h2>
        </div>

        {/* Dropdown if user has multiple applications */}
        <div className="app-tracking-switcher">
          {applications.length > 1 && (
            <div className="app-switch-selector">
              <label htmlFor="app-switch-select" className="app-switch-label">
                <Layers size={13} /> Switch Application ({applications.length}):
              </label>
              <select
                id="app-switch-select"
                className="form-select app-switch-dropdown"
                value={activeApp.id}
                onChange={(e) => onSelectApp && onSelectApp(parseInt(e.target.value))}
              >
                {applications.map(app => (
                  <option key={app.id} value={app.id}>
                    {app.application_number} — {app.instrument_type || 'Instrument'} ({app.current_status.replace(/_/g, ' ')})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Identity & Status Summary Row */}
      <div className="app-tracking-meta-grid">
        <div className="app-meta-box">
          <span className="app-meta-label">Instrument</span>
          <span className="app-meta-val primary">
            {activeApp.instrument_type || 'Standard Weighing Instrument'}
          </span>
          <span className="app-meta-sub">UID: {activeApp.instrument_uid || 'N/A'}</span>
        </div>

        <div className="app-meta-box">
          <span className="app-meta-label">Current Status</span>
          <div style={{ marginTop: '0.2rem' }}>
            <StatusBadge status={activeApp.current_status} />
          </div>
        </div>

        <div className="app-meta-box">
          <span className="app-meta-label">Assigned Verifier</span>
          <span className="app-meta-val">
            {activeApp.assigned_verifier_name ? (
              `${activeApp.assigned_verifier_name} (${activeApp.assigned_role || 'LMO'})`
            ) : (
              <span style={{ color: '#94A3B8' }}>Awaiting Allocation</span>
            )}
          </span>
        </div>

        <div className="app-meta-box">
          <span className="app-meta-label">Statutory Fee</span>
          <span className="app-meta-val">
            ₹{activeApp.fee_amount}{' '}
            <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#64748B' }}>
              ({activeApp.payment_status})
            </span>
          </span>
        </div>
      </div>

      {/* 9-State Workflow Timeline (Horizontal on desktop, Vertical on mobile) */}
      <div className="app-tracking-timeline-wrap">
        <div className="timeline-section-title">
          <span>9-State Verification Lifecycle</span>
        </div>
        <WorkflowTracker
          currentStatus={activeApp.current_status}
          application={activeApp}
        />
      </div>

      {/* NEXT ACTION UX Banner */}
      <div className={`app-next-action-banner tone-${nextAction.tone}`}>
        <div className="next-action-left">
          <div className="next-action-pill">NEXT ACTION</div>
          <div className="next-action-text-wrap">
            <h4 className="next-action-title">{nextAction.text}</h4>
            <p className="next-action-sub">{nextAction.subtext}</p>
          </div>
        </div>

        <div className="next-action-right">
          <button
            className={`btn ${nextAction.tone === 'danger' ? 'btn-danger' : (nextAction.tone === 'warning' ? 'btn-primary' : 'btn-navy')}`}
            onClick={handleActionClick}
          >
            {nextAction.buttonLabel}
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
