import datetime
from typing import Tuple
from app.models.enums import ValidityStatus

def calculate_validity_status(expiry_date: datetime.datetime, has_failed: bool = False) -> Tuple[ValidityStatus, int]:
    """
    Computes real-time dynamic validity status based on days remaining:
    - VALID: > 30 days
    - EXPIRING_SOON: 0 to 30 days
    - EXPIRED: < 0 days (past expiry)
    - RE_VERIFICATION_REQUIRED: if marked failed
    """
    if has_failed:
        return ValidityStatus.RE_VERIFICATION_REQUIRED, 0

    now = datetime.datetime.utcnow()
    # Normalize comparison to midnight
    exp = expiry_date if isinstance(expiry_date, datetime.datetime) else datetime.datetime.combine(expiry_date, datetime.time.min)
    
    delta = exp - now
    days_remaining = delta.days

    if days_remaining < 0:
        return ValidityStatus.EXPIRED, days_remaining
    elif days_remaining <= 30:
        return ValidityStatus.EXPIRING_SOON, days_remaining
    else:
        return ValidityStatus.VALID, days_remaining
