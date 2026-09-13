import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Instrument, Application, User, Certificate
from app.models.enums import WorkflowState, ApplicationType, PaymentStatus, RoleEnum
from app.schemas.schemas import ApplicationResponse
from app.api.deps import get_current_user
from app.services.fee_engine import calculate_authoritative_fee
from app.services.audit_service import create_audit_log
from app.api.v1.applications import _format_application

router = APIRouter(prefix="/reverification", tags=["Re-Verification"])

class StartReverificationRequest(BaseModel):
    instrument_id: int
    notes: str = "Initiating scheduled re-verification cycle"

@router.post("/start", response_model=ApplicationResponse)
def start_reverification(
    req: StartReverificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inst = db.query(Instrument).filter(Instrument.id == req.instrument_id).first()
    if not inst:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instrument not found")

    if current_user.role == RoleEnum.USER and inst.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this instrument")

    # Authoritative fee
    fee_data = calculate_authoritative_fee(db, inst)
    authoritative_fee = fee_data["authoritative_amount"]

    count = db.query(Application).count() + 1
    app_number = f"APP-2026-{count:04d}"

    # Per exact 9-state specification: RE_VERIFICATION_REQUIRED -> SUBMITTED
    # Creates a new application in SUBMITTED state ready for verifier allocation
    app = Application(
        application_number=app_number,
        instrument_id=inst.id,
        applicant_id=current_user.id,
        application_type=ApplicationType.RE_VERIFICATION,
        current_status=WorkflowState.SUBMITTED,
        fee_amount=authoritative_fee,
        payment_status=PaymentStatus.COMPLETED,
        scheduled_notes=req.notes
    )
    db.add(app)
    db.commit()
    db.refresh(app)

    create_audit_log(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role.value,
        event_type="REVERIFICATION_INITIATED",
        entity_name="Application",
        entity_id=app.application_number,
        metadata_json={
            "instrument_uid": inst.instrument_uid,
            "application_type": ApplicationType.RE_VERIFICATION.value,
            "workflow_state": WorkflowState.SUBMITTED.value
        }
    )

    return _format_application(app)
