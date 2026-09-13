import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import FeeConfiguration, User
from app.schemas.schemas import FeeConfigCreate, FeeConfigUpdate, FeeConfigResponse
from app.api.deps import require_admin
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/fees", tags=["Configurable Fee Engine"])

@router.get("/", response_model=List[FeeConfigResponse])
def list_fee_configs(db: Session = Depends(get_db)):
    return db.query(FeeConfiguration).order_by(FeeConfiguration.created_at.desc()).all()

@router.post("/", response_model=FeeConfigResponse)
def create_fee_config(
    fee_in: FeeConfigCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    existing = db.query(FeeConfiguration).filter(FeeConfiguration.fee_id == fee_in.fee_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Fee ID '{fee_in.fee_id}' already exists."
        )

    fee_cfg = FeeConfiguration(
        fee_id=fee_in.fee_id,
        category_type=fee_in.category_type,
        component_name=fee_in.component_name,
        amount=fee_in.amount,
        version=fee_in.version or "DEMO-1.0",
        source=fee_in.source or "Demonstration / Indicative Fee Configuration",
        is_active=fee_in.is_active
    )
    db.add(fee_cfg)
    db.commit()
    db.refresh(fee_cfg)

    create_audit_log(
        db=db,
        actor_id=admin_user.id,
        actor_name=admin_user.full_name,
        actor_role=admin_user.role.value,
        event_type="FEE_CONFIGURATION_CREATED",
        entity_name="FeeConfiguration",
        entity_id=fee_cfg.fee_id,
        metadata_json={
            "category": fee_cfg.category_type,
            "amount": fee_cfg.amount
        }
    )

    return fee_cfg

@router.put("/{fee_id}", response_model=FeeConfigResponse)
def update_fee_config(
    fee_id: str,
    fee_up: FeeConfigUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    fee_cfg = db.query(FeeConfiguration).filter(FeeConfiguration.fee_id == fee_id).first()
    if not fee_cfg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee configuration not found")

    if fee_up.amount is not None:
        fee_cfg.amount = fee_up.amount
    if fee_up.component_name is not None:
        fee_cfg.component_name = fee_up.component_name
    if fee_up.version is not None:
        fee_cfg.version = fee_up.version
    if fee_up.source is not None:
        fee_cfg.source = fee_up.source
    if fee_up.is_active is not None:
        fee_cfg.is_active = fee_up.is_active

    db.commit()
    db.refresh(fee_cfg)

    create_audit_log(
        db=db,
        actor_id=admin_user.id,
        actor_name=admin_user.full_name,
        actor_role=admin_user.role.value,
        event_type="FEE_CONFIGURATION_MODIFIED",
        entity_name="FeeConfiguration",
        entity_id=fee_cfg.fee_id,
        metadata_json={
            "updated_amount": fee_cfg.amount,
            "is_active": fee_cfg.is_active
        }
    )

    return fee_cfg
