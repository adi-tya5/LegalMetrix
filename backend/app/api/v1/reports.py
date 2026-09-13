from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Instrument, Application, Certificate, Verification, User
from app.models.enums import WorkflowState, VerificationResult, RoleEnum
from app.schemas.schemas import DashboardMetrics
from app.api.deps import get_current_user
from app.services.validity_service import calculate_validity_status
from app.models.enums import ValidityStatus

router = APIRouter(prefix="/reports", tags=["Reports & Metrics"])

@router.get("/metrics", response_model=DashboardMetrics)
def get_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    app_query = db.query(Application)
    inst_query = db.query(Instrument)
    cert_query = db.query(Certificate)
    ver_query = db.query(Verification)

    if current_user.role == RoleEnum.USER:
        app_query = app_query.filter(Application.applicant_id == current_user.id)
        inst_query = inst_query.filter(Instrument.owner_id == current_user.id)
        cert_query = cert_query.join(Instrument).filter(Instrument.owner_id == current_user.id)
        ver_query = ver_query.join(Instrument).filter(Instrument.owner_id == current_user.id)
    elif current_user.role in [RoleEnum.LMO, RoleEnum.GATC]:
        app_query = app_query.filter(Application.assigned_user_id == current_user.id)
        ver_query = ver_query.filter(Verification.verifier_id == current_user.id)

    total_inst = inst_query.count()
    pending_apps = app_query.filter(Application.current_status.in_([WorkflowState.PAYMENT_PENDING, WorkflowState.SUBMITTED])).count()
    assigned_apps = app_query.filter(Application.current_status == WorkflowState.LMO_ASSIGNED).count()
    sched_apps = app_query.filter(Application.current_status == WorkflowState.VERIFICATION_SCHEDULED).count()
    under_ver = app_query.filter(Application.current_status == WorkflowState.UNDER_VERIFICATION).count()
    rever_req = app_query.filter(Application.current_status == WorkflowState.RE_VERIFICATION_REQUIRED).count()
    certs_issued = cert_query.count()
    failed_vers = ver_query.filter(Verification.result == VerificationResult.FAIL).count()

    # Calculate expiring & expired
    expiring_count = 0
    expired_count = 0
    all_certs = cert_query.all()
    for c in all_certs:
        st, _ = calculate_validity_status(c.expiry_date)
        if st == ValidityStatus.EXPIRING_SOON:
            expiring_count += 1
        elif st == ValidityStatus.EXPIRED:
            expired_count += 1

    return DashboardMetrics(
        total_instruments=total_inst,
        pending_applications=pending_apps,
        assigned_applications=assigned_apps,
        scheduled_verifications=sched_apps,
        under_verification=under_ver,
        certificates_issued=certs_issued,
        expiring_certificates=expiring_count,
        expired_instruments=expired_count,
        reverification_required=rever_req,
        failed_verifications=failed_vers
    )
