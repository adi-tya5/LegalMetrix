import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Application, Instrument, User
from app.models.enums import WorkflowState, RoleEnum, ApplicationType, PaymentStatus
from app.schemas.schemas import ApplicationCreate, ApplicationResponse
from app.api.deps import get_current_user, require_admin
from app.services.fee_engine import calculate_authoritative_fee
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/applications", tags=["Applications"])

def _format_application(app: Application) -> ApplicationResponse:
    return ApplicationResponse(
        id=app.id,
        application_number=app.application_number,
        instrument_id=app.instrument_id,
        instrument_uid=app.instrument.instrument_uid if app.instrument else None,
        instrument_type=app.instrument.instrument_type if app.instrument else None,
        applicant_id=app.applicant_id,
        applicant_name=app.applicant.full_name if app.applicant else None,
        application_type=app.application_type,
        current_status=app.current_status,
        fee_amount=app.fee_amount,
        payment_status=app.payment_status,
        assigned_role=app.assigned_role,
        assigned_user_id=app.assigned_user_id,
        assigned_verifier_name=app.assigned_verifier.full_name if app.assigned_verifier else None,
        scheduled_date=app.scheduled_date,
        scheduled_notes=app.scheduled_notes,
        created_at=app.created_at,
        updated_at=app.updated_at
    )

@router.get("/", response_model=List[ApplicationResponse])
def list_applications(
    status_filter: Optional[WorkflowState] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Application)
    if current_user.role == RoleEnum.USER:
        query = query.filter(Application.applicant_id == current_user.id)
    elif current_user.role in [RoleEnum.LMO, RoleEnum.GATC]:
        query = query.filter(Application.assigned_user_id == current_user.id)

    if status_filter:
        query = query.filter(Application.current_status == status_filter)

    apps = query.order_by(Application.created_at.desc()).all()
    return [_format_application(a) for a in apps]

@router.post("/", response_model=ApplicationResponse)
def create_application(
    app_in: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    instrument = db.query(Instrument).filter(Instrument.id == app_in.instrument_id).first()
    if not instrument:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instrument not found")

    if current_user.role == RoleEnum.USER and instrument.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot apply for an instrument you do not own")

    # Authoritative Fee calculation
    fee_data = calculate_authoritative_fee(db, instrument)
    authoritative_fee = fee_data["authoritative_amount"]

    count = db.query(Application).count() + 1
    app_number = f"APP-2026-{count:04d}"

    # Initial state begins at DRAFT or transitions to PAYMENT_PENDING
    application = Application(
        application_number=app_number,
        instrument_id=instrument.id,
        applicant_id=current_user.id,
        application_type=app_in.application_type,
        current_status=WorkflowState.PAYMENT_PENDING, # Transitioned from DRAFT
        fee_amount=authoritative_fee,
        payment_status=PaymentStatus.PENDING
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    create_audit_log(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role.value,
        event_type="APPLICATION_CREATED",
        entity_name="Application",
        entity_id=application.application_number,
        metadata_json={
            "instrument_uid": instrument.instrument_uid,
            "calculated_fee": authoritative_fee,
            "state": application.current_status.value
        }
    )

    return _format_application(application)

@router.get("/{application_id}", response_model=ApplicationResponse)
def get_application_detail(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    # Access control
    if current_user.role == RoleEnum.USER and app.applicant_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this application")
    if current_user.role in [RoleEnum.LMO, RoleEnum.GATC] and app.assigned_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Not assigned to this application")

    return _format_application(app)
