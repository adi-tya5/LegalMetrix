import os
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Certificate, User
from app.models.enums import RoleEnum
from app.schemas.schemas import CertificateResponse, CertificateIntegrityResponse
from app.api.deps import get_current_user
from app.services.validity_service import calculate_validity_status
from app.services.certificate_service import verify_certificate_integrity
from app.services.rules_engine import DEMO_DISCLAIMER
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/certificates", tags=["Certificates"])

def _format_certificate_response(c: Certificate) -> CertificateResponse:
    inst = c.instrument
    ver = c.verification
    status_val, _ = calculate_validity_status(c.expiry_date)

    return CertificateResponse(
        id=c.id,
        certificate_number=c.certificate_number,
        instrument_id=c.instrument_id,
        instrument_uid=inst.instrument_uid if inst else None,
        instrument_type=inst.instrument_type if inst else None,
        owner_name=inst.owner.full_name if (inst and inst.owner) else None,
        issue_date=c.issue_date,
        expiry_date=c.expiry_date,
        verification_period_days=c.verification_period_days,
        verifier_id=c.verifier_id,
        verifier_name=c.verifier.full_name if c.verifier else None,
        verifier_role=c.verifier_role,
        sha256_hash=c.sha256_hash,
        display_fingerprint=c.display_fingerprint,
        qr_code_url=f"/api/v1/certificates/{c.id}/qr",
        pdf_url=f"/api/v1/certificates/{c.id}/pdf",
        validity_status=status_val,
        applied_rule_id=ver.applied_rule_id if ver else None,
        applied_rule_version=ver.applied_rule_version if ver else None,
        permissible_limit=ver.applied_limit if ver else None,
        disclaimer=DEMO_DISCLAIMER
    )

@router.get("/{certificate_id}", response_model=CertificateResponse)
def get_certificate(
    certificate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Support lookup by either numeric ID or certificate_number
    if certificate_id.isdigit():
        c = db.query(Certificate).filter(Certificate.id == int(certificate_id)).first()
    else:
        c = db.query(Certificate).filter(Certificate.certificate_number == certificate_id).first()

    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificate not found")

    # Access scoping
    if current_user.role == RoleEnum.USER and c.instrument and c.instrument.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this certificate")

    create_audit_log(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role.value,
        event_type="CERTIFICATE_VIEWED",
        entity_name="Certificate",
        entity_id=c.certificate_number
    )

    return _format_certificate_response(c)

@router.get("/{certificate_id}/verify-integrity", response_model=CertificateIntegrityResponse)
def check_integrity(
    certificate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if certificate_id.isdigit():
        c = db.query(Certificate).filter(Certificate.id == int(certificate_id)).first()
    else:
        c = db.query(Certificate).filter(Certificate.certificate_number == certificate_id).first()

    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificate not found")

    res = verify_certificate_integrity(c)
    return CertificateIntegrityResponse(**res)

@router.get("/{certificate_id}/pdf")
def download_certificate_pdf(
    certificate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if certificate_id.isdigit():
        c = db.query(Certificate).filter(Certificate.id == int(certificate_id)).first()
    else:
        c = db.query(Certificate).filter(Certificate.certificate_number == certificate_id).first()

    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificate not found")

    if current_user.role == RoleEnum.USER and c.instrument and c.instrument.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    if not c.pdf_path or not os.path.exists(c.pdf_path):
        from app.services.pdf_service import generate_pdf_certificate
        c.pdf_path = generate_pdf_certificate(c)
        db.commit()

    return FileResponse(
        path=c.pdf_path,
        media_type="application/pdf",
        filename=f"Certificate_{c.certificate_number}.pdf"
    )

@router.get("/{certificate_id}/qr")
def get_certificate_qr(
    certificate_id: str,
    db: Session = Depends(get_db)
):
    if certificate_id.isdigit():
        c = db.query(Certificate).filter(Certificate.id == int(certificate_id)).first()
    else:
        c = db.query(Certificate).filter(Certificate.certificate_number == certificate_id).first()

    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificate not found")

    if not c.qr_code_path or not os.path.exists(c.qr_code_path):
        from app.services.qr_service import generate_qr_code_for_certificate
        c.qr_code_path = generate_qr_code_for_certificate(c.certificate_number)
        db.commit()

    return FileResponse(
        path=c.qr_code_path,
        media_type="image/png"
    )

# ----------------- IMMUTABILITY GUARDS -----------------
# Section 17 & Test Cases 8 & 9:
# PUT certificate -> 405 Method Not Allowed
# DELETE certificate -> 405 Method Not Allowed

@router.put("/{certificate_id}")
def update_certificate_immutable(certificate_id: str):
    raise HTTPException(
        status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
        detail="Certificates are cryptographically sealed and permanently immutable. Modification is strictly prohibited."
    )

@router.delete("/{certificate_id}")
def delete_certificate_immutable(certificate_id: str):
    raise HTTPException(
        status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
        detail="Certificates are permanent legal metrology records and immutable. Deletion is strictly prohibited."
    )
