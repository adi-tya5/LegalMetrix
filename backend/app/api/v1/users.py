from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import User
from app.models.enums import RoleEnum
from app.schemas.schemas import UserResponse
from app.api.deps import get_current_user, require_admin

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/", response_model=List[UserResponse])
def list_users(
    role: Optional[RoleEnum] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    return query.all()

@router.get("/verifiers", response_model=List[UserResponse])
def list_available_verifiers(
    role: Optional[RoleEnum] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns active LMO and GATC personnel for assignment.
    Accessible to Admin or Verifiers.
    """
    query = db.query(User).filter(User.is_active == True)
    if role:
        query = query.filter(User.role == role)
    else:
        query = query.filter(User.role.in_([RoleEnum.LMO, RoleEnum.GATC]))
    return query.all()
