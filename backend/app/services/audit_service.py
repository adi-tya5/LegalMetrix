import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.models import AuditLog

def create_audit_log(
    db: Session,
    actor_id: Optional[int],
    actor_name: str,
    actor_role: str,
    event_type: str,
    entity_name: str,
    entity_id: str,
    metadata_json: Optional[Dict[str, Any]] = None
) -> AuditLog:
    """
    Creates an immutable audit log entry.
    Audit records are write-only / append-only.
    """
    log_entry = AuditLog(
        timestamp=datetime.datetime.utcnow(),
        actor_id=actor_id,
        actor_name=actor_name,
        actor_role=actor_role,
        event_type=event_type,
        entity_name=entity_name,
        entity_id=str(entity_id),
        metadata_json=metadata_json or {}
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry
