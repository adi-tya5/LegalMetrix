import React from 'react';
import {
  Check,
  Circle,
  AlertOctagon,
  ArrowDown,
  Clock,
  UserCheck,
  Calendar,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';

// Standard 8 progressive steps in normal happy path
const HAPPY_PATH_STEPS = [
  { key: 'DRAFT', label: 'Draft Created', shortLabel: 'Draft' },
  { key: 'PAYMENT_PENDING', label: 'Payment Pending', shortLabel: 'Pay Pending' },
  { key: 'PAYMENT_COMPLETED', label: 'Payment Completed', shortLabel: 'Payment' },
  { key: 'SUBMITTED', label: 'Application Submitted', shortLabel: 'Submitted' },
  { key: 'LMO_ASSIGNED', label: 'Assigned to LMO/GATC', shortLabel: 'Assigned' },
  { key: 'VERIFICATION_SCHEDULED', label: 'Verification Scheduled', shortLabel: 'Scheduled' },
  { key: 'UNDER_VERIFICATION', label: 'Field Verification', shortLabel: 'Verification' },
  { key: 'CERTIFICATE_ISSUED', label: 'Certificate Issued', shortLabel: 'Certificate' },
];

export const WorkflowTracker = ({
  currentStatus,
  application = null,
  forceVertical = false
}) => {
  const isFailed = currentStatus === 'RE_VERIFICATION_REQUIRED';

  // Determine current step index in standard flow
  const currentIndex = HAPPY_PATH_STEPS.findIndex(s => s.key === currentStatus);

  // Helper to format date
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return null;
    }
  };

  const getStepMetadata = (stepKey) => {
    if (!application) return null;
    switch (stepKey) {
      case 'DRAFT':
      case 'SUBMITTED':
        return application.created_at ? formatDate(application.created_at) : null;
      case 'PAYMENT_COMPLETED':
        return application.payment_status === 'COMPLETED' ? 'Paid ₹' + application.fee_amount : null;
      case 'LMO_ASSIGNED':
        return application.assigned_verifier_name
          ? `${application.assigned_verifier_name} (${application.assigned_role || 'LMO'})`
          : null;
      case 'VERIFICATION_SCHEDULED':
        return application.scheduled_date
          ? formatDate(application.scheduled_date)
          : (application.scheduled_notes || null);
      case 'UNDER_VERIFICATION':
        return application.current_status === 'UNDER_VERIFICATION' ? 'In Progress' : null;
      case 'CERTIFICATE_ISSUED':
        return application.current_status === 'CERTIFICATE_ISSUED' ? 'Digitally Sealed' : null;
      default:
        return null;
    }
  };

  return (
    <div className="workflow-tracker-container">
      {/* ---------------- DESKTOP VIEW (Horizontal) ---------------- */}
      <div className={`workflow-tracker-desktop ${forceVertical ? 'force-hide' : ''}`}>
        {!isFailed ? (
          <div className="wf-desktop-track">
            {HAPPY_PATH_STEPS.map((step, idx) => {
              const isCompleted = currentIndex > idx;
              const isCurrent = currentIndex === idx;
              const isUpcoming = currentIndex < idx;
              const meta = getStepMetadata(step.key);

              return (
                <div
                  key={step.key}
                  className={`wf-desktop-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'active' : ''} ${isUpcoming ? 'upcoming' : ''}`}
                >
                  <div className="wf-node-wrapper">
                    {/* Connecting line on the left */}
                    {idx > 0 && (
                      <div className={`wf-line-left ${currentIndex >= idx ? 'filled' : ''}`} />
                    )}

                    {/* Node circle */}
                    <div className="wf-circle">
                      {isCompleted ? (
                        <Check size={14} strokeWidth={3} />
                      ) : isCurrent ? (
                        <span className="wf-pulsing-dot" />
                      ) : (
                        <span className="wf-step-num">{idx + 1}</span>
                      )}
                    </div>

                    {/* Connecting line on the right */}
                    {idx < HAPPY_PATH_STEPS.length - 1 && (
                      <div className={`wf-line-right ${currentIndex > idx ? 'filled' : ''}`} />
                    )}
                  </div>

                  <div className="wf-step-info">
                    <div className="wf-step-label">{step.shortLabel}</div>
                    {isCurrent && <span className="wf-current-tag">CURRENT</span>}
                    {meta && <div className="wf-step-meta">{meta}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* FAIL / RE_VERIFICATION_REQUIRED branch on desktop */
          <div className="wf-fail-branch-desktop">
            <div className="wf-desktop-track" style={{ marginBottom: '1rem' }}>
              {HAPPY_PATH_STEPS.slice(0, 6).map((step, idx) => (
                <div key={step.key} className="wf-desktop-step completed">
                  <div className="wf-node-wrapper">
                    {idx > 0 && <div className="wf-line-left filled" />}
                    <div className="wf-circle">
                      <Check size={14} strokeWidth={3} />
                    </div>
                    {idx < 5 && <div className="wf-line-right filled" />}
                  </div>
                  <div className="wf-step-info">
                    <div className="wf-step-label">{step.shortLabel}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Failure callout card */}
            <div className="wf-fail-banner">
              <div className="wf-fail-icon">
                <AlertOctagon size={24} />
              </div>
              <div className="wf-fail-details">
                <div className="wf-fail-title">
                  <strong>Verification Result: FAILED</strong>
                  <span className="badge badge-expired" style={{ marginLeft: '0.5rem' }}>
                    RE-VERIFICATION REQUIRED
                  </span>
                </div>
                <div className="wf-fail-reason">
                  <strong>Reason:</strong> {application?.scheduled_notes || 'Measurement error tolerance exceeded maximum permissible limit in field test.'}
                </div>
                <div className="wf-fail-action">
                  <strong>Corrective Action:</strong> Instrument transducer requires recalibration/servicing by authorized vendor before statutory re-verification.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---------------- MOBILE VIEW (Vertical) ---------------- */}
      <div className={`workflow-tracker-mobile ${forceVertical ? 'force-show' : ''}`}>
        {!isFailed ? (
          <div className="wf-mobile-vertical-list">
            {HAPPY_PATH_STEPS.map((step, idx) => {
              const isCompleted = currentIndex > idx;
              const isCurrent = currentIndex === idx;
              const isUpcoming = currentIndex < idx;
              const meta = getStepMetadata(step.key);

              return (
                <div
                  key={step.key}
                  className={`wf-mobile-item ${isCompleted ? 'completed' : ''} ${isCurrent ? 'active' : ''} ${isUpcoming ? 'upcoming' : ''}`}
                >
                  <div className="wf-mobile-left">
                    <div className="wf-mobile-circle">
                      {isCompleted ? (
                        <Check size={13} strokeWidth={3} />
                      ) : isCurrent ? (
                        <span className="wf-pulsing-dot" />
                      ) : (
                        <Circle size={10} strokeWidth={2} />
                      )}
                    </div>
                    {idx < HAPPY_PATH_STEPS.length - 1 && (
                      <div className={`wf-mobile-connector ${currentIndex > idx ? 'filled' : ''}`} />
                    )}
                  </div>

                  <div className="wf-mobile-content">
                    <div className="wf-mobile-header">
                      <span className="wf-mobile-title">{step.label}</span>
                      {isCurrent && <span className="wf-current-tag-mobile">● CURRENT</span>}
                    </div>
                    {meta && <div className="wf-mobile-meta">{meta}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* FAIL / RE_VERIFICATION_REQUIRED branch on mobile */
          <div className="wf-mobile-vertical-list">
            {HAPPY_PATH_STEPS.slice(0, 6).map((step, idx) => (
              <div key={step.key} className="wf-mobile-item completed">
                <div className="wf-mobile-left">
                  <div className="wf-mobile-circle">
                    <Check size={13} strokeWidth={3} />
                  </div>
                  <div className="wf-mobile-connector filled" />
                </div>
                <div className="wf-mobile-content">
                  <div className="wf-mobile-title">{step.label}</div>
                </div>
              </div>
            ))}

            {/* Failed verification step */}
            <div className="wf-mobile-item failed active">
              <div className="wf-mobile-left">
                <div className="wf-mobile-circle failed">
                  <AlertOctagon size={13} strokeWidth={2.5} />
                </div>
                <div className="wf-mobile-connector filled" />
              </div>
              <div className="wf-mobile-content">
                <div className="wf-mobile-header">
                  <span className="wf-mobile-title" style={{ color: '#DC2626', fontWeight: '700' }}>
                    Verification: FAILED
                  </span>
                  <span className="badge badge-expired" style={{ fontSize: '0.65rem' }}>RESULT</span>
                </div>
                <div className="wf-mobile-meta" style={{ color: '#991B1B', marginTop: '0.2rem' }}>
                  Tolerance exceeded statutory limits.
                </div>
              </div>
            </div>

            {/* Re-verification required step */}
            <div className="wf-mobile-item failed active">
              <div className="wf-mobile-left">
                <div className="wf-mobile-circle failed">
                  <RotateCcw size={13} strokeWidth={2.5} />
                </div>
              </div>
              <div className="wf-mobile-content">
                <div className="wf-mobile-header">
                  <span className="wf-mobile-title" style={{ color: '#DC2626', fontWeight: '800' }}>
                    RE-VERIFICATION REQUIRED
                  </span>
                  <span className="wf-current-tag-mobile" style={{ background: '#FEE2E2', color: '#991B1B' }}>
                    ACTION REQUIRED
                  </span>
                </div>
                <div className="wf-mobile-meta" style={{ color: '#7F1D1D', marginTop: '0.2rem' }}>
                  Corrective action required before initiating re-verification.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
