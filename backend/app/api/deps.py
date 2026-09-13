from typing import Generator, Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.models import User
from app.models.enums import RoleEnum

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    user_id: Optional[str] = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    return user

class RoleChecker:
    def __init__(self, allowed_roles: List[RoleEnum]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: User does not have sufficient role permissions. Required: {[r.value for r in self.allowed_roles]}"
            )
        return current_user

require_admin = RoleChecker([RoleEnum.ADMIN])
require_verifier = RoleChecker([RoleEnum.LMO, RoleEnum.GATC, RoleEnum.ADMIN])
require_lmo = RoleChecker([RoleEnum.LMO, RoleEnum.ADMIN])
require_gatc = RoleChecker([RoleEnum.GATC, RoleEnum.ADMIN])
require_any_user = RoleChecker([RoleEnum.USER, RoleEnum.LMO, RoleEnum.GATC, RoleEnum.ADMIN])
