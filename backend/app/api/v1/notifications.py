from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Notification, User
from app.models.enums import RoleEnum
from app.schemas.schemas import NotificationResponse
from app.api.deps import get_current_user
from app.services.notification_service import evaluate_and_generate_notifications

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("/", response_model=List[NotificationResponse])
def get_notifications(
    unread_only: bool = Query(False, description="Filter unread only"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns notifications for the authenticated user after dynamic validity evaluation.
    - USER sees only their own instrument alerts.
    - LMO/GATC sees only alerts relevant to their assigned dockets.
    - ADMIN sees system notifications.
    """
    # Trigger dynamic certificate validity & re-verification check
    evaluate_and_generate_notifications(db)

    query = db.query(Notification)
    if current_user.role != RoleEnum.ADMIN:
        query = query.filter(Notification.user_id == current_user.id)

    if unread_only:
        query = query.filter(Notification.read_status == False)

    return query.order_by(Notification.created_at.desc()).all()

@router.post("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Notification).filter(Notification.id == notification_id)
    if current_user.role != RoleEnum.ADMIN:
        query = query.filter(Notification.user_id == current_user.id)

    n = query.first()
    if not n:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    n.read_status = True
    db.commit()
    return {"status": "ok", "id": notification_id}

@router.post("/mark-all-read")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Notification).filter(Notification.read_status == False)
    if current_user.role != RoleEnum.ADMIN:
        query = query.filter(Notification.user_id == current_user.id)

    unread_notifications = query.all()
    for n in unread_notifications:
        n.read_status = True
    db.commit()

    return {"status": "ok", "marked_read_count": len(unread_notifications)}

@router.post("/check", response_model=List[NotificationResponse])
def trigger_notification_check(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually trigger notification evaluation across certificates and verifications.
    Returns the updated notifications list for the authenticated user.
    """
    evaluate_and_generate_notifications(db)
    query = db.query(Notification)
    if current_user.role != RoleEnum.ADMIN:
        query = query.filter(Notification.user_id == current_user.id)
    return query.order_by(Notification.created_at.desc()).all()
