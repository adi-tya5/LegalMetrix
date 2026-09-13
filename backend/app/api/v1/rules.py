import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Rule, User
from app.models.enums import RoleEnum
from app.schemas.schemas import RuleCreate, RuleUpdate, RuleResponse
from app.api.deps import get_current_user, require_admin
from app.services.rules_engine import DEMO_DISCLAIMER
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/rules", tags=["Rules Engine"])

@router.get("/", response_model=List[RuleResponse])
def list_rules(
    active_only: bool = False,
    instrument_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Rule)
    if active_only:
        query = query.filter(Rule.is_active == True)
    if instrument_type:
        query = query.filter(Rule.instrument_type == instrument_type)
    return query.order_by(Rule.created_at.desc()).all()

@router.post("/", response_model=RuleResponse)
def create_rule(
    rule_in: RuleCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    existing = db.query(Rule).filter(Rule.rule_id == rule_in.rule_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Rule ID '{rule_in.rule_id}' already exists. Use versioning to create a new version."
        )

    rule = Rule(
        rule_id=rule_in.rule_id,
        instrument_type=rule_in.instrument_type,
        accuracy_class=rule_in.accuracy_class,
        test_parameter=rule_in.test_parameter,
        permissible_limit_value=rule_in.permissible_limit_value,
        limit_type=rule_in.limit_type,
        verification_period_days=rule_in.verification_period_days,
        source=rule_in.source or "Demonstration Configuration",
        version=rule_in.version or "DEMO-1.0",
        effective_from=rule_in.effective_from or datetime.datetime.utcnow(),
        effective_to=rule_in.effective_to,
        is_active=rule_in.is_active
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)

    create_audit_log(
        db=db,
        actor_id=admin_user.id,
        actor_name=admin_user.full_name,
        actor_role=admin_user.role.value,
        event_type="RULE_CREATED",
        entity_name="Rule",
        entity_id=rule.rule_id,
        metadata_json={
            "permissible_limit": rule.permissible_limit_value,
            "version": rule.version
        }
    )

    return rule

@router.put("/{rule_id}", response_model=RuleResponse)
def update_rule(
    rule_id: str,
    rule_up: RuleUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    rule = db.query(Rule).filter(Rule.rule_id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")

    if rule_up.permissible_limit_value is not None:
        rule.permissible_limit_value = rule_up.permissible_limit_value
    if rule_up.limit_type is not None:
        rule.limit_type = rule_up.limit_type
    if rule_up.verification_period_days is not None:
        rule.verification_period_days = rule_up.verification_period_days
    if rule_up.version is not None:
        rule.version = rule_up.version
    if rule_up.source is not None:
        rule.source = rule_up.source
    if rule_up.is_active is not None:
        rule.is_active = rule_up.is_active

    db.commit()
    db.refresh(rule)

    create_audit_log(
        db=db,
        actor_id=admin_user.id,
        actor_name=admin_user.full_name,
        actor_role=admin_user.role.value,
        event_type="RULE_MODIFIED",
        entity_name="Rule",
        entity_id=rule.rule_id,
        metadata_json={
            "new_limit": rule.permissible_limit_value,
            "is_active": rule.is_active
        }
    )

    return rule
