import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  FileText,
  Activity,
  RotateCcw,
  Calendar,
  UserCheck,
  CreditCard
} from 'lucide-react';

export const StatusBadge = ({ status, size = 'normal' }) => {
  if (!status) return null;

  const normalized = status.toUpperCase().replace(/\s+/g, '_');
  let label = status.replace(/_/g, ' ');

  let badgeClass = 'badge-info';
  let Icon = Activity;

  switch (normalized) {
    case 'DRAFT':
      badgeClass = 'badge-draft';
      Icon = FileText;
      label = 'Draft';
      break;

    case 'PAYMENT_PENDING':
      badgeClass = 'badge-expiring';
      Icon = CreditCard;
      label = 'Payment Pending';
      break;

    case 'PAYMENT_COMPLETED':
      badgeClass = 'badge-valid';
      Icon = CheckCircle2;
      label = 'Payment Completed';
      break;

    case 'SUBMITTED':
      badgeClass = 'badge-active';
      Icon = Clock;
      label = 'Submitted';
      break;

    case 'LMO_ASSIGNED':
    case 'ASSIGNED':
      badgeClass = 'badge-active';
      Icon = UserCheck;
      label = 'Assigned';
      break;

    case 'VERIFICATION_SCHEDULED':
    case 'SCHEDULED':
      badgeClass = 'badge-expiring';
      Icon = Calendar;
      label = 'Scheduled';
      break;

    case 'UNDER_VERIFICATION':
      badgeClass = 'badge-active';
      Icon = Activity;
      label = 'Under Verification';
      break;

    case 'CERTIFICATE_ISSUED':
    case 'VALID':
    case 'VERIFIED':
    case 'PASS':
    case 'COMPLETED':
      badgeClass = 'badge-valid';
      Icon = ShieldCheck;
      label = normalized === 'PASS' ? 'Pass' : (normalized === 'VALID' ? 'Valid' : (normalized === 'CERTIFICATE_ISSUED' ? 'Certificate Issued' : 'Verified'));
      break;

    case 'EXPIRING_SOON':
      badgeClass = 'badge-expiring';
      Icon = AlertTriangle;
      label = 'Expiring Soon';
      break;

    case 'EXPIRED':
      badgeClass = 'badge-expired';
      Icon = XCircle;
      label = 'Expired';
      break;

    case 'RE_VERIFICATION_REQUIRED':
    case 'FAIL':
    case 'FAILED':
    case 'INTEGRITY_COMPROMISED':
      badgeClass = 'badge-expired';
      Icon = RotateCcw;
      label = normalized === 'FAIL' ? 'Fail' : 'Re-Verification Required';
      break;

    default:
      badgeClass = 'badge-info';
      Icon = Activity;
      break;
  }

  const iconSize = size === 'small' ? 12 : 14;

  return (
    <span className={`badge ${badgeClass} ${size === 'small' ? 'badge-sm' : ''}`}>
      <Icon size={iconSize} strokeWidth={2.4} style={{ flexShrink: 0 }} />
      <span>{label}</span>
    </span>
  );
};
