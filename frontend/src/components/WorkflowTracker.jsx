import React from 'react';

const STEPS = [
  { key: 'DRAFT', label: 'Draft' },
  { key: 'PAYMENT_PENDING', label: 'Payment Pending' },
  { key: 'PAYMENT_COMPLETED', label: 'Payment Done' },
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'LMO_ASSIGNED', label: 'Assigned' },
  { key: 'VERIFICATION_SCHEDULED', label: 'Scheduled' },
  { key: 'UNDER_VERIFICATION', label: 'Testing' },
  { key: 'CERTIFICATE_ISSUED', label: 'Certified' },
];

export const WorkflowTracker = ({ currentStatus }) => {
  const isFailed = currentStatus === 'RE_VERIFICATION_REQUIRED';
  
  // Find current step index
  const currentIndex = STEPS.findIndex(s => s.key === currentStatus);

  return (
    <div style={{ margin: '1.5rem 0', background: '#FFFFFF', padding: '1.25rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.5px' }}>
        9-State Verification Workflow Progress
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        {/* Connecting line */}
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '20px',
          right: '20px',
          height: '3px',
          backgroundColor: '#E2E8F0',
          zIndex: 0
        }} />

        {STEPS.map((step, idx) => {
          let isPassed = currentIndex > idx;
          let isCurrent = currentIndex === idx;
          let isFailStep = isFailed && idx === 7;

          let circleClass = 'step-circle';
          if (isPassed) circleClass += ' completed';
          if (isCurrent && !isFailed) circleClass += ' active';
          if (isFailStep) circleClass += ' failed';

          return (
            <div key={step.key} className="step-item" style={{ zIndex: 1, background: '#FFFFFF', padding: '0 4px' }}>
              <div className={circleClass}>
                {isFailStep ? '✕' : (isPassed ? '✓' : idx + 1)}
              </div>
              <div className={`step-label ${isCurrent ? 'active' : ''}`} style={{ fontSize: '0.68rem' }}>
                {isFailStep ? 'Failed (Re-verify)' : step.label}
              </div>
            </div>
          );
        })}
      </div>

      {isFailed && (
        <div style={{
          marginTop: '1rem',
          padding: '0.6rem 0.85rem',
          backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: '6px',
          color: '#991B1B',
          fontSize: '0.825rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <strong>Status: RE_VERIFICATION_REQUIRED.</strong> Field inspection tolerance exceeded permissible limit.
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Step 9 of 9</span>
        </div>
      )}
    </div>
  );
};
