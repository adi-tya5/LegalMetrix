import React from 'react';

export const StatusBadge = ({ status }) => {
  if (!status) return null;

  const normalized = status.toUpperCase().replace(/\s+/g, '_');

  let badgeClass = 'badge-info';
  let label = status.replace(/_/g, ' ');

  switch (normalized) {
    case 'VALID':
    case 'VERIFIED':
    case 'PASS':
    case 'CERTIFICATE_ISSUED':
    case 'COMPLETED':
      badgeClass = 'badge-valid';
      break;

    case 'EXPIRING_SOON':
    case 'PENDING':
    case 'PAYMENT_PENDING':
    case 'VERIFICATION_SCHEDULED':
    case 'LMO_ASSIGNED':
      badgeClass = 'badge-expiring';
      break;

    case 'EXPIRED':
    case 'FAIL':
    case 'FAILED':
    case 'RE_VERIFICATION_REQUIRED':
    case 'INTEGRITY_COMPROMISED':
      badgeClass = 'badge-expired';
      break;

    case 'UNDER_VERIFICATION':
    case 'SUBMITTED':
    case 'PAYMENT_COMPLETED':
      badgeClass = 'badge-active';
      break;

    default:
      badgeClass = 'badge-info';
      break;
  }

  return (
    <span className={`badge ${badgeClass}`}>
      <span style={{ fontSize: '0.65rem' }}>●</span> {label}
    </span>
  );
};
