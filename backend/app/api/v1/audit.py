from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import AuditLog, User
from app.schemas.schemas import AuditLogResponse
from app.api.deps import require_admin, get_current_user

router = APIRouter(prefix="/audit", tags=["Audit Trail"])

@router.get("/", response_model=List[AuditLogResponse])
def get_audit_trail(
    entity_name: Optional[str] = None,
    event_type: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(AuditLog)
    if entity_name:
        query = query.filter(AuditLog.entity_name == entity_name)
    if event_type:
        query = query.filter(AuditLog.event_type == event_type)

    return query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
