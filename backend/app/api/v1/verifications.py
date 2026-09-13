import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Application, Verification, Certificate, Evidence, Instrument, User
from app.models.enums import WorkflowState, RoleEnum, VerificationResult, LimitType
from app.schemas.schemas import (
    VerificationResponse, VerificationStartRequest, VerificationSubmitRequest,
    CalculatePreviewRequest, CalculatePreviewResponse, EvidenceResponse
)
from app.api.deps import get_current_user, require_verifier
from app.services.rules_engine import resolve_applicable_rule
from app.services.calculation_engine import calculate_verification_result, preview_calculation
from app.services.certificate_service import (
    generate_canonical_string, compute_sha256_hash
)
from app.services.qr_service import generate_qr_code_for_certificate
from app.services.pdf_service import generate_pdf_certificate
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/verifications", tags=["Field Verification"])

def _format_verification(v: Verification) -> VerificationResponse:
    cert_id = v.certificate.id if v.certificate else None
    cert_no = v.certificate.certificate_number if v.certificate else None
    evidences = [
        EvidenceResponse(
            id=e.id,
            verification_id=e.verification_id,
            category=e.category,
            filename=e.filename,
            file_path=e.file_path,
            file_type=e.file_type,
            description=e.description,
            latitude=e.latitude,
            longitude=e.longitude,
            uploaded_at=e.uploaded_at,
            is_locked=e.is_locked
        ) for e in v.evidences
    ]

    app = v.application
    inst = v.instrument

    applicant_name = None
    if app and app.applicant:
        applicant_name = app.applicant.full_name
    elif inst and inst.owner:
        applicant_name = inst.owner.full_name

    return VerificationResponse(
        id=v.id,
        verification_number=v.verification_number,
        application_id=v.application_id,
        application_number=app.application_number if app else None,
        instrument_id=v.instrument_id,
        instrument_uid=inst.instrument_uid if inst else None,
        instrument_type=inst.instrument_type if inst else None,
        manufacturer=inst.manufacturer if inst else None,
        model_number=inst.model_number if inst else None,
        serial_number=inst.serial_number if inst else None,
        max_capacity=inst.max_capacity if inst else None,
        unit=inst.unit if inst else None,
        accuracy_class=inst.accuracy_class if inst else None,
        applicant_name=applicant_name,
        scheduled_date=app.scheduled_date if app else None,
        current_status=app.current_status.value if (app and app.current_status) else None,
        verifier_id=v.verifier_id,
        verifier_name=v.verifier.full_name if v.verifier else None,
        verifier_role=v.verifier_role,
        verification_date=v.verification_date,
        identity_confirmed=v.identity_confirmed,
        physical_condition=v.physical_condition,
        seal_condition=v.seal_condition,
        display_condition=v.display_condition,
        remarks=v.remarks,
        reference_value=v.reference_value,
        observed_value=v.observed_value,
        error_value=v.error_value,
        percentage_error=v.percentage_error,
        applied_rule_id=v.applied_rule_id,
        applied_rule_version=v.applied_rule_version,
        applied_limit=v.applied_limit,
        applied_limit_type=v.applied_limit_type,
        result=v.result,
        failure_reason=v.failure_reason,
        corrective_action=v.corrective_action,
        verification_lat=v.verification_lat,
        verification_lng=v.verification_lng,
        gps_accuracy=v.gps_accuracy,
        is_submitted=v.is_submitted,
        submitted_at=v.submitted_at,
        evidences=evidences,
        certificate_id=cert_id,
        certificate_number=cert_no
    )

@router.get("/", response_model=List[VerificationResponse])
def list_verifications(
    active_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Verification)
    if current_user.role == RoleEnum.USER:
        query = query.join(Instrument).filter(Instrument.owner_id == current_user.id)
    elif current_user.role in [RoleEnum.LMO, RoleEnum.GATC]:
        query = query.filter(Verification.verifier_id == current_user.id)

    if active_only:
        query = query.filter(Verification.is_submitted == False)

    verifications = query.order_by(Verification.verification_date.desc()).all()
    return [_format_verification(v) for v in verifications]

@router.post("/preview-calc", response_model=CalculatePreviewResponse)
def preview_calc(req: CalculatePreviewRequest, db: Session = Depends(get_db)):
    result_data = preview_calculation(
        db=db,
        instrument_type=req.instrument_type,
        accuracy_class=req.accuracy_class,
        test_parameter=req.test_parameter,
        reference_value=req.reference_value,
        observed_value=req.observed_value
    )
    return CalculatePreviewResponse(**result_data)

@router.post("/start", response_model=VerificationResponse)
def start_verification(
    req: VerificationStartRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_verifier)
):
    """
    Officer starts verification.
    Transitions: VERIFICATION_SCHEDULED -> UNDER_VERIFICATION
    """
    app = db.query(Application).filter(Application.id == req.application_id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    # Access scoping: Only the assigned verifier or admin can start
    if current_user.role in [RoleEnum.LMO, RoleEnum.GATC] and app.assigned_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You are not the assigned verifier for this application"
        )

    # Check existing draft verification
    existing = db.query(Verification).filter(
        Verification.application_id == app.id,
        Verification.is_submitted == False
    ).first()
    if existing:
        return _format_verification(existing)

    count = db.query(Verification).count() + 1
    ver_num = f"VER-2026-{count:05d}"

    verification = Verification(
        verification_number=ver_num,
        application_id=app.id,
        instrument_id=app.instrument_id,
        verifier_id=current_user.id,
        verifier_role=current_user.role,
        verification_date=datetime.datetime.utcnow(),
        is_submitted=False
    )
    db.add(verification)

    # Update application status to UNDER_VERIFICATION
    app.current_status = WorkflowState.UNDER_VERIFICATION
    db.commit()
    db.refresh(verification)

    event_type = f"{current_user.role.value}_STARTED_INSPECTION"
    create_audit_log(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role.value,
        event_type=event_type,
        entity_name="Verification",
        entity_id=verification.verification_number,
        metadata_json={
            "application_number": app.application_number,
            "instrument_uid": app.instrument.instrument_uid
        }
    )

    return _format_verification(verification)

@router.get("/{verification_id}", response_model=VerificationResponse)
def get_verification(
    verification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    v = db.query(Verification).filter(Verification.id == verification_id).first()
    if not v:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Verification not found")
    
    # Scoping
    if current_user.role == RoleEnum.USER and v.instrument.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    if current_user.role in [RoleEnum.LMO, RoleEnum.GATC] and v.verifier_id != current_user.id and current_user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to other verifier records")

    return _format_verification(v)

@router.post("/{verification_id}/submit", response_model=VerificationResponse)
def submit_verification(
    verification_id: int,
    req: VerificationSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_verifier)
):
    v = db.query(Verification).filter(Verification.id == verification_id).first()
    if not v:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Verification not found")

    if v.is_submitted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification has already been submitted and cannot be modified (Immutable)."
        )

    # Verifier authorization
    if current_user.role in [RoleEnum.LMO, RoleEnum.GATC] and v.verifier_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You cannot submit verification for another officer's docket."
        )

    inst = v.instrument
    app = v.application

    # Resolve applicable rule from Rules Engine
    rule = resolve_applicable_rule(
        db=db,
        instrument_type=inst.instrument_type,
        accuracy_class=inst.accuracy_class,
        test_parameter="Measurement Error"
    )

    # Perform authoritative calculation
    calc = calculate_verification_result(
        reference_value=req.reference_value,
        observed_value=req.observed_value,
        applied_rule=rule
    )

    calc_result = calc["result"]

    # FAIL checks
    if calc_result == VerificationResult.FAIL:
        if not req.failure_reason or not req.failure_reason.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="failure_reason is REQUIRED when verification result is FAIL."
            )
        if not req.corrective_action or not req.corrective_action.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="corrective_action is REQUIRED when verification result is FAIL."
            )

    # Update verification record
    v.identity_confirmed = req.identity_confirmed
    v.physical_condition = req.physical_condition
    v.seal_condition = req.seal_condition
    v.display_condition = req.display_condition
    v.remarks = req.remarks
    v.reference_value = req.reference_value
    v.observed_value = req.observed_value
    v.error_value = calc["error_value"]
    v.percentage_error = calc["percentage_error"]
    v.applied_rule_id = calc["applied_rule_id"]
    v.applied_rule_version = calc["applied_rule_version"]
    v.applied_limit = calc["permissible_limit_value"]
    v.applied_limit_type = calc["limit_type"]
    v.applied_period_days = rule.get("verification_period_days", 365)
    v.result = calc_result
    v.failure_reason = req.failure_reason
    v.corrective_action = req.corrective_action
    
    # Optional GPS capture
    v.verification_lat = req.verification_lat
    v.verification_lng = req.verification_lng
    v.gps_accuracy = req.gps_accuracy
    if req.verification_lat is not None:
        v.gps_timestamp = datetime.datetime.utcnow()

    v.is_submitted = True
    v.submitted_at = datetime.datetime.utcnow()

    # Lock all evidences permanently
    for ev in v.evidences:
        ev.is_locked = True

    if req.verification_lat is not None:
        create_audit_log(
            db=db,
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            actor_role=current_user.role.value,
            event_type="LOCATION_CAPTURED",
            entity_name="Verification",
            entity_id=v.verification_number,
            metadata_json={
                "lat": req.verification_lat,
                "lng": req.verification_lng,
                "accuracy": req.gps_accuracy
            }
        )

    create_audit_log(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role.value,
        event_type="VERIFICATION_SUBMITTED",
        entity_name="Verification",
        entity_id=v.verification_number,
        metadata_json={
            "result": calc_result.value,
            "error_percentage": calc["percentage_error"],
            "rule_id": calc["applied_rule_id"]
        }
    )

    # Workflow branching
    if calc_result == VerificationResult.PASS:
        # Generate Certificate
        cert_count = db.query(Certificate).count() + 1
        cert_num = f"CERT-MH-001-{cert_count:04d}"

        issue_dt = datetime.datetime.utcnow()
        period_days = v.applied_period_days or 365
        expiry_dt = issue_dt + datetime.timedelta(days=period_days)

        canonical_str = generate_canonical_string(
            certificate_number=cert_num,
            instrument_uid=inst.instrument_uid,
            verification_number=v.verification_number,
            issue_date=issue_dt,
            expiry_date=expiry_dt,
            result="VERIFIED",
            applied_rule_id=v.applied_rule_id,
            applied_rule_version=v.applied_rule_version
        )
        sha256_h, display_fp = compute_sha256_hash(canonical_str)

        # Generate QR code
        qr_file = generate_qr_code_for_certificate(cert_num)

        certificate = Certificate(
            certificate_number=cert_num,
            verification_id=v.id,
            instrument_id=inst.id,
            issue_date=issue_dt,
            expiry_date=expiry_dt,
            verification_period_days=period_days,
            verifier_id=current_user.id,
            verifier_role=current_user.role,
            canonical_data_string=canonical_str,
            sha256_hash=sha256_h,
            display_fingerprint=display_fp,
            qr_code_path=qr_file
        )
        db.add(certificate)
        db.commit()
        db.refresh(certificate)

        # Generate PDF Certificate
        pdf_file = generate_pdf_certificate(certificate)
        certificate.pdf_path = pdf_file

        # Transition Application to CERTIFICATE_ISSUED
        app.current_status = WorkflowState.CERTIFICATE_ISSUED
        db.commit()

        create_audit_log(
            db=db,
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            actor_role=current_user.role.value,
            event_type="PASS_CERTIFICATE_GENERATED",
            entity_name="Certificate",
            entity_id=cert_num,
            metadata_json={
                "fingerprint": display_fp,
                "sha256_hash": sha256_h,
                "expiry_date": expiry_dt.strftime("%Y-%m-%d")
            }
        )

    else:
        # Result == FAIL
        # Certificate MUST NOT be generated!
        # Application state becomes RE_VERIFICATION_REQUIRED
        app.current_status = WorkflowState.RE_VERIFICATION_REQUIRED
        db.commit()

        create_audit_log(
            db=db,
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            actor_role=current_user.role.value,
            event_type="FAIL_REVERIFICATION_REQUIRED",
            entity_name="Verification",
            entity_id=v.verification_number,
            metadata_json={
                "failure_reason": req.failure_reason,
                "corrective_action": req.corrective_action
            }
        )

    db.refresh(v)
    return _format_verification(v)
