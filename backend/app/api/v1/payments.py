import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Application, Payment, Instrument, User
from app.models.enums import WorkflowState, PaymentStatus, RoleEnum
from app.schemas.schemas import (
    FeeCalculationRequest, FeeCalculationResponse,
    MockPaymentRequest, MockPaymentResponse
)
from app.api.deps import get_current_user
from app.services.fee_engine import calculate_authoritative_fee, DEMO_FEE_DISCLAIMER
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/payments", tags=["Payments"])

@router.post("/calculate", response_model=FeeCalculationResponse)
def calculate_fee(req: FeeCalculationRequest, db: Session = Depends(get_db)):
    instrument = db.query(Instrument).filter(Instrument.id == req.instrument_id).first()
    if not instrument:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instrument not found")
    
    fee_data = calculate_authoritative_fee(db, instrument)
    return FeeCalculationResponse(**fee_data)

@router.post("/process", response_model=MockPaymentResponse)
def process_mock_payment(
    req: MockPaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    app = db.query(Application).filter(Application.id == req.application_id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    if current_user.role == RoleEnum.USER and app.applicant_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot pay for another user's application")

    if app.current_status not in [WorkflowState.DRAFT, WorkflowState.PAYMENT_PENDING]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Application is not in payment pending state (current state: {app.current_status.value})"
        )

    # CRITICAL: Backend authoritative fee enforcement!
    fee_data = calculate_authoritative_fee(db, app.instrument)
    authoritative_amount = fee_data["authoritative_amount"]
    
    # Store or verify authoritative amount on application
    app.fee_amount = authoritative_amount

    # If simulation fails
    if req.simulate_failure:
        app.payment_status = PaymentStatus.FAILED
        # Remains in PAYMENT_PENDING
        app.current_status = WorkflowState.PAYMENT_PENDING
        db.commit()

        create_audit_log(
            db=db,
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            actor_role=current_user.role.value,
            event_type="PAYMENT_FAILED_SIMULATION",
            entity_name="Application",
            entity_id=app.application_number,
            metadata_json={"attempted_amount": authoritative_amount}
        )

        return MockPaymentResponse(
            payment_reference="FAIL-REF",
            application_id=app.id,
            amount_paid=0.0,
            status=PaymentStatus.FAILED,
            workflow_state=app.current_status,
            message="Payment simulation failed as requested. Application remains in PAYMENT_PENDING state."
        )

    # Success: PAYMENT_COMPLETED -> SUBMITTED
    ref_count = db.query(Payment).count() + 1
    pay_ref = f"PAY-2026-{ref_count:05d}"

    payment = Payment(
        payment_reference=pay_ref,
        application_id=app.id,
        amount=authoritative_amount,
        status=PaymentStatus.COMPLETED,
        payment_method=req.payment_method,
        gateway_response={
            "gateway": "DEMO_GATEWAY",
            "status": "SUCCESS",
            "enforced_amount": authoritative_amount,
            "ignored_client_amount": req.submitted_amount
        }
    )
    db.add(payment)

    # Transitions
    app.payment_status = PaymentStatus.COMPLETED
    # Transition sequence: PAYMENT_PENDING -> PAYMENT_COMPLETED -> SUBMITTED
    app.current_status = WorkflowState.SUBMITTED
    db.commit()
    db.refresh(app)

    create_audit_log(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role.value,
        event_type="PAYMENT_COMPLETED",
        entity_name="Application",
        entity_id=app.application_number,
        metadata_json={
            "payment_reference": pay_ref,
            "authoritative_amount": authoritative_amount,
            "next_state": WorkflowState.SUBMITTED.value
        }
    )

    return MockPaymentResponse(
        payment_reference=pay_ref,
        application_id=app.id,
        amount_paid=authoritative_amount,
        status=PaymentStatus.COMPLETED,
        workflow_state=app.current_status,
        message="Demo Payment Successful. Application is now officially SUBMITTED and queued for allocation."
    )
