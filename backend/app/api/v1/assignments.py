import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Application, Assignment, User
from app.models.enums import WorkflowState, RoleEnum
from app.schemas.schemas import AllocationRequest, ApplicationResponse
from app.api.deps import require_admin
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/assignments", tags=["Assignments & Scheduling"])

@router.post("/{application_id}/allocate", response_model=ApplicationResponse)
def allocate_application(
    application_id: int,
    req: AllocationRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """
    Admin allocates application to either LMO or GATC and sets inspection schedule.
    Validates that application is in SUBMITTED state (Payment must be completed).
    Transitions: SUBMITTED -> LMO_ASSIGNED -> VERIFICATION_SCHEDULED
    """
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    if app.current_status == WorkflowState.PAYMENT_PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A payment-pending application cannot be allocated to an LMO or GATC."
        )

    if app.current_status not in [WorkflowState.SUBMITTED, WorkflowState.LMO_ASSIGNED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Application cannot be allocated from current state: {app.current_status.value}"
        )

    # Validate verifier
    verifier = db.query(User).filter(User.id == req.assigned_user_id).first()
    if not verifier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned verifier not found")

    if req.assigned_role not in [RoleEnum.LMO, RoleEnum.GATC]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assigned role must be LMO or GATC")

    if verifier.role != req.assigned_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User role mismatch: {verifier.full_name} is registered as {verifier.role.value}, not {req.assigned_role.value}"
        )

    # Record assignment history
    assignment_record = Assignment(
        application_id=app.id,
        assigned_role=req.assigned_role,
        assigned_user_id=verifier.id,
        assigned_by_admin_id=admin_user.id,
        scheduled_date=req.scheduled_date,
        notes=req.notes
    )
    db.add(assignment_record)

    # State update
    app.assigned_role = req.assigned_role
    app.assigned_user_id = verifier.id
    app.scheduled_date = req.scheduled_date
    app.scheduled_notes = req.notes
    
    # Workflow transitions:
    # SUBMITTED -> LMO_ASSIGNED -> VERIFICATION_SCHEDULED
    app.current_status = WorkflowState.VERIFICATION_SCHEDULED
    db.commit()
    db.refresh(app)

    create_audit_log(
        db=db,
        actor_id=admin_user.id,
        actor_name=admin_user.full_name,
        actor_role=admin_user.role.value,
        event_type="APPLICATION_ALLOCATED_AND_SCHEDULED",
        entity_name="Application",
        entity_id=app.application_number,
        metadata_json={
            "assigned_role": req.assigned_role.value,
            "assigned_verifier_id": verifier.id,
            "assigned_verifier_name": verifier.full_name,
            "scheduled_date": req.scheduled_date.isoformat(),
            "status": app.current_status.value
        }
    )

    from app.api.v1.applications import _format_application
    return _format_application(app)
