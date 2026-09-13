import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Certificate, Instrument
from app.schemas.schemas import PublicQRResponse
from app.services.validity_service import calculate_validity_status
from app.services.certificate_service import verify_certificate_integrity
from app.services.rules_engine import DEMO_DISCLAIMER
from app.services.audit_service import create_audit_log
from app.models.enums import ValidityStatus

router = APIRouter(tags=["Public QR Verification"])

@router.get("/verify/{certificate_id}", response_model=PublicQRResponse)
def public_verify_certificate(
    certificate_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    PUBLIC PRIVACY-SAFE QR VERIFICATION ENDPOINT.
    - Requires NO LOGIN / NO AUTHENTICATION.
    - Dynamically evaluates live certificate validity.
    - Evaluates SHA-256 cryptographic integrity.
    - STRICT PRIVACY: Redacts owner phone, email, full private address, precise GPS, and raw evidence photos.
    - Logs public QR verification in audit trail.
    """
    # Look up by numeric ID or certificate_number (e.g. CERT-MH-001-0001)
    if certificate_id.isdigit():
        cert = db.query(Certificate).filter(Certificate.id == int(certificate_id)).first()
    else:
        cert = db.query(Certificate).filter(Certificate.certificate_number == certificate_id).first()

    client_host = request.client.host if request.client else "unknown"

    if not cert:
        create_audit_log(
            db=db,
            actor_id=None,
            actor_name="Public Visitor",
            actor_role="PUBLIC",
            event_type="PUBLIC_QR_VERIFICATION_FAILED",
            entity_name="Certificate",
            entity_id=certificate_id,
            metadata_json={"ip": client_host, "reason": "Certificate not found"}
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate record not found. Please ensure the QR code or Certificate ID is authentic."
        )

    # Cryptographic integrity check
    integrity_res = verify_certificate_integrity(cert)
    integrity_status = integrity_res["integrity_status"]

    # Dynamic validity status
    validity_status, _ = calculate_validity_status(cert.expiry_date)
    if integrity_status == "INTEGRITY_COMPROMISED":
        validity_status = ValidityStatus.INTEGRITY_COMPROMISED

    # Mask Instrument ID for privacy (e.g. INST-2026-0001 -> INST-****-0001)
    inst = cert.instrument
    raw_uid = inst.instrument_uid if inst else "UNKNOWN"
    parts = raw_uid.split("-")
    if len(parts) >= 3:
        masked_uid = f"{parts[0]}-****-{parts[2]}"
    else:
        masked_uid = f"{raw_uid[:4]}****"

    create_audit_log(
        db=db,
        actor_id=None,
        actor_name="Public Visitor",
        actor_role="PUBLIC",
        event_type="PUBLIC_QR_VERIFICATION_SUCCESS",
        entity_name="Certificate",
        entity_id=cert.certificate_number,
        metadata_json={
            "ip": client_host,
            "validity_status": validity_status.value,
            "integrity_status": integrity_status
        }
    )

    return PublicQRResponse(
        certificate_number=cert.certificate_number,
        instrument_masked_id=masked_uid,
        instrument_type=inst.instrument_type if inst else "Weighing Instrument",
        accuracy_class=inst.accuracy_class if inst else "Demo",
        verification_date=cert.issue_date,
        expiry_date=cert.expiry_date,
        validity_status=validity_status,
        result="VERIFIED",
        verifier_type=cert.verifier_role,
        integrity_status=integrity_status,
        display_fingerprint=cert.display_fingerprint,
        disclaimer=DEMO_DISCLAIMER
    )
