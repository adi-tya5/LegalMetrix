import os
import datetime
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import EVIDENCE_DIR
from app.models.models import Verification, Evidence, User
from app.models.enums import EvidenceCategory, RoleEnum
from app.schemas.schemas import EvidenceResponse
from app.api.deps import require_verifier
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/evidence", tags=["Evidence"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf", ".webp"}

@router.post("/upload", response_model=EvidenceResponse)
async def upload_evidence(
    verification_id: int = Form(...),
    category: EvidenceCategory = Form(...),
    description: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_verifier)
):
    verification = db.query(Verification).filter(Verification.id == verification_id).first()
    if not verification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Verification docket not found")

    if verification.is_submitted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Evidence cannot be added: Verification docket has already been submitted and locked (Immutable)."
        )

    if current_user.role in [RoleEnum.LMO, RoleEnum.GATC] and verification.verifier_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You are not the assigned verifier for this docket."
        )

    # Validate GPS coordinates if provided
    if latitude is not None and not (-90.0 <= latitude <= 90.0):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Latitude must be between -90.0 and +90.0 degrees."
        )
    if longitude is not None and not (-180.0 <= longitude <= 180.0):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Longitude must be between -180.0 and +180.0 degrees."
        )

    # Validate file extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file extension. Allowed: {list(ALLOWED_EXTENSIONS)}"
        )

    # Save file
    timestamp_str = datetime.datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    clean_fn = f"ev_{verification_id}_{timestamp_str}_{Path(file.filename).stem[:20]}{ext}"
    dest_path = EVIDENCE_DIR / clean_fn

    contents = await file.read()
    with open(dest_path, "wb") as f:
        f.write(contents)

    evidence = Evidence(
        verification_id=verification.id,
        category=category,
        filename=file.filename,
        file_path=str(dest_path),
        file_type=file.content_type or "application/octet-stream",
        file_size_bytes=len(contents),
        description=description,
        latitude=latitude,
        longitude=longitude,
        is_locked=False
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    create_audit_log(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role.value,
        event_type="EVIDENCE_ADDED",
        entity_name="Evidence",
        entity_id=str(evidence.id),
        metadata_json={
            "verification_number": verification.verification_number,
            "category": category.value,
            "filename": file.filename
        }
    )

    return evidence

@router.delete("/{evidence_id}")
def delete_evidence(
    evidence_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_verifier)
):
    """
    Allowed ONLY before verification is submitted.
    """
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found")

    if evidence.is_locked or (evidence.verification and evidence.verification.is_submitted):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Submitted evidence is permanent and immutable. It cannot be deleted."
        )

    if current_user.role in [RoleEnum.LMO, RoleEnum.GATC] and evidence.verification.verifier_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Audit before removal
    create_audit_log(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role.value,
        event_type="EVIDENCE_REMOVED_BEFORE_SUBMISSION",
        entity_name="Evidence",
        entity_id=str(evidence.id),
        metadata_json={
            "verification_number": evidence.verification.verification_number,
            "category": evidence.category.value,
            "filename": evidence.filename
        }
    )

    db.delete(evidence)
    db.commit()

    return {"detail": "Draft evidence removed successfully", "id": evidence_id}
