import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Instrument, User, Verification, Certificate
from app.models.enums import RoleEnum
from app.schemas.schemas import (
    InstrumentCreate, InstrumentResponse, InstrumentDetailResponse,
    VerificationSummary, CertificateSummary
)
from app.api.deps import get_current_user
from app.services.validity_service import calculate_validity_status
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/instruments", tags=["Instruments"])

def _format_instrument_response(inst: Instrument, db: Session) -> InstrumentResponse:
    latest_cert = db.query(Certificate).filter(
        Certificate.instrument_id == inst.id
    ).order_by(Certificate.issue_date.desc()).first()

    cert_summary = None
    curr_status = "PENDING_VERIFICATION"
    
    if latest_cert:
        # Check if most recent verification failed
        latest_ver = db.query(Verification).filter(
            Verification.instrument_id == inst.id
        ).order_by(Verification.verification_date.desc()).first()
        has_failed = bool(latest_ver and latest_ver.result and latest_ver.result.value == "FAIL")

        val_status, _ = calculate_validity_status(latest_cert.expiry_date, has_failed=has_failed)
        curr_status = val_status.value
        cert_summary = CertificateSummary(
            id=latest_cert.id,
            certificate_number=latest_cert.certificate_number,
            issue_date=latest_cert.issue_date,
            expiry_date=latest_cert.expiry_date,
            validity_status=val_status,
            sha256_hash=latest_cert.sha256_hash,
            display_fingerprint=latest_cert.display_fingerprint
        )
    else:
        # Check if failed verification without certificate
        latest_ver = db.query(Verification).filter(
            Verification.instrument_id == inst.id
        ).order_by(Verification.verification_date.desc()).first()
        if latest_ver and latest_ver.result and latest_ver.result.value == "FAIL":
            curr_status = "RE_VERIFICATION_REQUIRED"

    return InstrumentResponse(
        id=inst.id,
        instrument_uid=inst.instrument_uid,
        owner_id=inst.owner_id,
        owner_name=inst.owner.full_name if inst.owner else None,
        instrument_type=inst.instrument_type,
        category=inst.category,
        manufacturer=inst.manufacturer,
        model_number=inst.model_number,
        serial_number=inst.serial_number,
        max_capacity=inst.max_capacity,
        unit=inst.unit,
        accuracy_class=inst.accuracy_class,
        location_address=inst.location_address,
        latitude=inst.latitude,
        longitude=inst.longitude,
        current_status=curr_status,
        latest_certificate=cert_summary,
        created_at=inst.created_at,
        updated_at=inst.updated_at
    )

@router.get("/", response_model=List[InstrumentResponse])
def list_instruments(
    q: Optional[str] = Query(None, description="Search by UID or Serial Number"),
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Instrument)
    
    # Scoping: Non-admin users see only their own instruments
    if current_user.role == RoleEnum.USER:
        query = query.filter(Instrument.owner_id == current_user.id)

    if q:
        search = f"%{q}%"
        query = query.filter(
            (Instrument.instrument_uid.ilike(search)) |
            (Instrument.serial_number.ilike(search)) |
            (Instrument.model_number.ilike(search))
        )
    if category:
        query = query.filter(Instrument.category == category)

    instruments = query.order_by(Instrument.created_at.desc()).all()
    return [_format_instrument_response(i, db) for i in instruments]

@router.post("/", response_model=InstrumentResponse)
def register_instrument(
    inst_in: InstrumentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Unique UID generation: INST-2026-XXXX
    count = db.query(Instrument).count() + 1
    uid = f"INST-2026-{count:04d}"

    # Check serial number uniqueness
    existing = db.query(Instrument).filter(
        Instrument.serial_number == inst_in.serial_number,
        Instrument.manufacturer == inst_in.manufacturer
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An instrument with serial number '{inst_in.serial_number}' from '{inst_in.manufacturer}' already exists."
        )

    instrument = Instrument(
        instrument_uid=uid,
        owner_id=current_user.id,
        instrument_type=inst_in.instrument_type,
        category=inst_in.category,
        manufacturer=inst_in.manufacturer,
        model_number=inst_in.model_number,
        serial_number=inst_in.serial_number,
        max_capacity=inst_in.max_capacity,
        unit=inst_in.unit,
        accuracy_class=inst_in.accuracy_class or "Demo",
        location_address=inst_in.location_address,
        latitude=inst_in.latitude,
        longitude=inst_in.longitude
    )
    db.add(instrument)
    db.commit()
    db.refresh(instrument)

    create_audit_log(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role.value,
        event_type="INSTRUMENT_REGISTERED",
        entity_name="Instrument",
        entity_id=instrument.instrument_uid,
        metadata_json={
            "type": instrument.instrument_type,
            "serial": instrument.serial_number,
            "category": instrument.category
        }
    )

    return _format_instrument_response(instrument, db)

@router.get("/{instrument_id}", response_model=InstrumentDetailResponse)
def get_instrument_detail(
    instrument_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inst = db.query(Instrument).filter(Instrument.id == instrument_id).first()
    if not inst:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instrument not found")

    # Access scoping
    if current_user.role == RoleEnum.USER and inst.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this instrument profile")

    base_resp = _format_instrument_response(inst, db)

    # Connected Verification History
    verifications = db.query(Verification).filter(
        Verification.instrument_id == inst.id
    ).order_by(Verification.verification_date.desc()).all()

    ver_history = [
        VerificationSummary(
            id=v.id,
            verification_number=v.verification_number,
            verification_date=v.verification_date,
            verifier_role=v.verifier_role,
            verifier_name=v.verifier.full_name if v.verifier else None,
            result=v.result,
            reference_value=v.reference_value,
            observed_value=v.observed_value,
            percentage_error=v.percentage_error,
            applied_limit=v.applied_limit,
            failure_reason=v.failure_reason,
            corrective_action=v.corrective_action
        ) for v in verifications
    ]

    # Connected Certificate History
    certs = db.query(Certificate).filter(
        Certificate.instrument_id == inst.id
    ).order_by(Certificate.issue_date.desc()).all()

    cert_history = [
        CertificateSummary(
            id=c.id,
            certificate_number=c.certificate_number,
            issue_date=c.issue_date,
            expiry_date=c.expiry_date,
            validity_status=calculate_validity_status(c.expiry_date)[0],
            sha256_hash=c.sha256_hash,
            display_fingerprint=c.display_fingerprint
        ) for c in certs
    ]

    return InstrumentDetailResponse(
        **base_resp.dict(),
        verification_history=ver_history,
        certificate_history=cert_history
    )
