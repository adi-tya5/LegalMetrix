import datetime
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.models import Notification, Certificate, Instrument, Verification, Application, User
from app.services.validity_service import calculate_validity_status
from app.models.enums import ValidityStatus, VerificationResult

def evaluate_and_generate_notifications(db: Session) -> List[Notification]:
    """
    Evaluates certificate validity and inspection failures dynamically.
    Generates required notifications with deterministic deduplication keys.
    Safe to run repeatedly without creating duplicates.
    """
    generated: List[Notification] = []

    # 1. Scan certificates for EXPIRY_SOON and EXPIRED
    certificates = db.query(Certificate).all()
    for cert in certificates:
        inst = cert.instrument
        if not inst or not inst.owner_id:
            continue

        status, days_remaining = calculate_validity_status(cert.expiry_date)
        owner_id = inst.owner_id
        expiry_date_str = cert.expiry_date.strftime('%Y-%m-%d')

        if status == ValidityStatus.EXPIRING_SOON:
            dedup_key = f"USER_{owner_id}:CERT_{cert.certificate_number}:EXPIRY_SOON:{expiry_date_str}"
            existing = db.query(Notification).filter(Notification.dedup_key == dedup_key).first()
            if not existing:
                notif = Notification(
                    user_id=owner_id,
                    notification_type="EXPIRY_SOON",
                    title="Certificate Expiring Soon",
                    message=(
                        f"Certificate {cert.certificate_number} for instrument {inst.instrument_uid} "
                        f"expires in {days_remaining} days. Start re-verification to maintain validity."
                    ),
                    instrument_id=inst.id,
                    instrument_uid=inst.instrument_uid,
                    certificate_id=cert.id,
                    certificate_number=cert.certificate_number,
                    dedup_key=dedup_key,
                    read_status=False,
                    created_at=datetime.datetime.utcnow()
                )
                db.add(notif)
                db.commit()
                db.refresh(notif)
                generated.append(notif)

        elif status == ValidityStatus.EXPIRED:
            dedup_key = f"USER_{owner_id}:CERT_{cert.certificate_number}:EXPIRED:{expiry_date_str}"
            existing = db.query(Notification).filter(Notification.dedup_key == dedup_key).first()
            if not existing:
                notif = Notification(
                    user_id=owner_id,
                    notification_type="EXPIRED",
                    title="Certificate Expired",
                    message=(
                        f"Certificate {cert.certificate_number} for instrument {inst.instrument_uid} "
                        f"expired on {expiry_date_str}. Immediate re-verification is required."
                    ),
                    instrument_id=inst.id,
                    instrument_uid=inst.instrument_uid,
                    certificate_id=cert.id,
                    certificate_number=cert.certificate_number,
                    dedup_key=dedup_key,
                    read_status=False,
                    created_at=datetime.datetime.utcnow()
                )
                db.add(notif)
                db.commit()
                db.refresh(notif)
                generated.append(notif)

    # 2. Scan verifications for RE_VERIFICATION_REQUIRED
    failed_vers = db.query(Verification).filter(Verification.result == VerificationResult.FAIL).all()
    for ver in failed_vers:
        inst = ver.instrument
        if not inst or not inst.owner_id:
            continue
        owner_id = inst.owner_id

        dedup_key = f"USER_{owner_id}:VER_{ver.verification_number}:RE_VERIFICATION_REQUIRED"
        existing = db.query(Notification).filter(Notification.dedup_key == dedup_key).first()
        if not existing:
            reason = ver.failure_reason or "Tolerances exceeded"
            notif = Notification(
                user_id=owner_id,
                notification_type="RE_VERIFICATION_REQUIRED",
                title="Re-Verification Required",
                message=(
                    f"Verification for instrument {inst.instrument_uid} failed. "
                    f"Reason: {reason}. Corrective action required. Please start re-verification."
                ),
                instrument_id=inst.id,
                instrument_uid=inst.instrument_uid,
                certificate_id=None,
                certificate_number=None,
                dedup_key=dedup_key,
                read_status=False,
                created_at=datetime.datetime.utcnow()
            )
            db.add(notif)
            db.commit()
            db.refresh(notif)
            generated.append(notif)

    # 3. Verifier assignment notifications for LMO and GATC
    active_apps = db.query(Application).filter(
        Application.assigned_user_id != None
    ).all()
    for app in active_apps:
        verifier_id = app.assigned_user_id
        dedup_key = f"VERIFIER_{verifier_id}:APP_{app.application_number}:ASSIGNED"
        existing = db.query(Notification).filter(Notification.dedup_key == dedup_key).first()
        if not existing:
            notif = Notification(
                user_id=verifier_id,
                notification_type="WORKFLOW",
                title="New Verification Docket Assigned",
                message=(
                    f"Application {app.application_number} for instrument {app.instrument.instrument_uid} "
                    f"({app.instrument.instrument_type}) has been assigned to your verification docket."
                ),
                instrument_id=app.instrument_id,
                instrument_uid=app.instrument.instrument_uid if app.instrument else None,
                certificate_id=None,
                certificate_number=None,
                dedup_key=dedup_key,
                read_status=False,
                created_at=datetime.datetime.utcnow()
            )
            db.add(notif)
            db.commit()
            db.refresh(notif)
            generated.append(notif)

    return generated

def create_notification(
    db: Session,
    user_id: int,
    notification_type: str,
    title: str,
    message: str,
    instrument_id: Optional[int] = None,
    instrument_uid: Optional[str] = None,
    certificate_id: Optional[int] = None,
    certificate_number: Optional[str] = None,
    dedup_key: Optional[str] = None,
) -> Notification:
    if dedup_key:
        existing = db.query(Notification).filter(Notification.dedup_key == dedup_key).first()
        if existing:
            return existing
    notif = Notification(
        user_id=user_id,
        notification_type=notification_type,
        title=title,
        message=message,
        instrument_id=instrument_id,
        instrument_uid=instrument_uid,
        certificate_id=certificate_id,
        certificate_number=certificate_number,
        dedup_key=dedup_key,
        read_status=False,
        created_at=datetime.datetime.utcnow(),
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif

# Maintain backward compatibility alias
def check_and_send_expiry_notifications(db: Session):
    return evaluate_and_generate_notifications(db)
