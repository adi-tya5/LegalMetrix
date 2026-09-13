import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from app.models.enums import (
    RoleEnum, WorkflowState, VerificationResult, LimitType,
    ValidityStatus, EvidenceCategory, ApplicationType, PaymentStatus
)

# ----------------- AUTH & USER -----------------
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: RoleEnum
    user_id: int
    full_name: str
    username: str

class LoginRequest(BaseModel):
    username: str
    password: str

class UserBase(BaseModel):
    email: str
    username: str
    full_name: str
    role: RoleEnum = RoleEnum.USER
    organization: Optional[str] = None
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# ----------------- INSTRUMENT -----------------
class InstrumentBase(BaseModel):
    instrument_type: str
    category: str # Standard, Platform, Precision, Heavy Weighbridge, etc.
    manufacturer: str
    model_number: str
    serial_number: str
    max_capacity: float
    unit: str = "kg"
    accuracy_class: Optional[str] = "Demo"
    location_address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class InstrumentCreate(InstrumentBase):
    pass

class CertificateSummary(BaseModel):
    id: int
    certificate_number: str
    issue_date: datetime.datetime
    expiry_date: datetime.datetime
    validity_status: ValidityStatus
    sha256_hash: str
    display_fingerprint: str

    class Config:
        from_attributes = True

class VerificationSummary(BaseModel):
    id: int
    verification_number: str
    verification_date: datetime.datetime
    verifier_role: RoleEnum
    verifier_name: Optional[str] = None
    result: Optional[VerificationResult] = None
    reference_value: Optional[float] = None
    observed_value: Optional[float] = None
    percentage_error: Optional[float] = None
    applied_limit: Optional[float] = None
    failure_reason: Optional[str] = None
    corrective_action: Optional[str] = None

    class Config:
        from_attributes = True

class InstrumentResponse(InstrumentBase):
    id: int
    instrument_uid: str
    owner_id: int
    owner_name: Optional[str] = None
    current_status: Optional[str] = None
    latest_certificate: Optional[CertificateSummary] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True

class InstrumentDetailResponse(InstrumentResponse):
    verification_history: List[VerificationSummary] = []
    certificate_history: List[CertificateSummary] = []

# ----------------- APPLICATION -----------------
class ApplicationCreate(BaseModel):
    instrument_id: int
    application_type: ApplicationType = ApplicationType.INITIAL
    notes: Optional[str] = None

class AllocationRequest(BaseModel):
    assigned_role: RoleEnum # LMO or GATC
    assigned_user_id: int
    scheduled_date: datetime.datetime
    notes: Optional[str] = None

class ApplicationResponse(BaseModel):
    id: int
    application_number: str
    instrument_id: int
    instrument_uid: Optional[str] = None
    instrument_type: Optional[str] = None
    applicant_id: int
    applicant_name: Optional[str] = None
    application_type: ApplicationType
    current_status: WorkflowState
    fee_amount: float
    payment_status: PaymentStatus
    assigned_role: Optional[RoleEnum] = None
    assigned_user_id: Optional[int] = None
    assigned_verifier_name: Optional[str] = None
    scheduled_date: Optional[datetime.datetime] = None
    scheduled_notes: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True

# ----------------- PAYMENT -----------------
class FeeCalculationRequest(BaseModel):
    instrument_id: int

class FeeCalculationResponse(BaseModel):
    instrument_category: str
    component_name: str
    authoritative_amount: float
    version: str
    source_disclaimer: str

class MockPaymentRequest(BaseModel):
    application_id: int
    # Frontend may send an amount, but backend will calculate & enforce authoritative fee
    submitted_amount: Optional[float] = None
    payment_method: str = "DEMO_NETBANKING"
    simulate_failure: bool = False

class MockPaymentResponse(BaseModel):
    payment_reference: str
    application_id: int
    amount_paid: float
    status: PaymentStatus
    workflow_state: WorkflowState
    message: str
    disclaimer: str = "Demo Payment — No real transaction is performed."

# ----------------- EVIDENCE -----------------
class EvidenceResponse(BaseModel):
    id: int
    verification_id: int
    category: EvidenceCategory
    filename: str
    file_path: str
    file_type: str
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    uploaded_at: datetime.datetime
    is_locked: bool

    class Config:
        from_attributes = True

# ----------------- VERIFICATION -----------------
class CalculatePreviewRequest(BaseModel):
    instrument_type: str
    accuracy_class: Optional[str] = None
    test_parameter: str = "Measurement Error"
    reference_value: float
    observed_value: float

class CalculatePreviewResponse(BaseModel):
    reference_value: float
    observed_value: float
    error_value: float
    percentage_error: float
    applied_rule_id: str
    applied_rule_version: str
    permissible_limit_value: float
    limit_type: LimitType
    rule_source: str
    result: VerificationResult
    disclaimer: str

class VerificationStartRequest(BaseModel):
    application_id: int

class VerificationSubmitRequest(BaseModel):
    identity_confirmed: bool = True
    physical_condition: str = "Good"
    seal_condition: str = "Intact"
    display_condition: str = "Clear and Legible"
    remarks: Optional[str] = None
    reference_value: float
    observed_value: float
    failure_reason: Optional[str] = None
    corrective_action: Optional[str] = None
    # Optional GPS with boundary validation
    verification_lat: Optional[float] = Field(None, ge=-90.0, le=90.0, description="Verification Latitude [-90 to +90]")
    verification_lng: Optional[float] = Field(None, ge=-180.0, le=180.0, description="Verification Longitude [-180 to +180]")
    gps_accuracy: Optional[float] = Field(None, ge=0.0, description="GPS Accuracy in meters (>= 0)")

class VerificationResponse(BaseModel):
    id: int
    verification_number: str
    application_id: int
    application_number: Optional[str] = None
    instrument_id: int
    instrument_uid: Optional[str] = None
    instrument_type: Optional[str] = None
    manufacturer: Optional[str] = None
    model_number: Optional[str] = None
    serial_number: Optional[str] = None
    max_capacity: Optional[float] = None
    unit: Optional[str] = None
    accuracy_class: Optional[str] = None
    applicant_name: Optional[str] = None
    scheduled_date: Optional[datetime.datetime] = None
    current_status: Optional[str] = None
    verifier_id: int
    verifier_name: Optional[str] = None
    verifier_role: RoleEnum
    verification_date: datetime.datetime
    identity_confirmed: bool
    physical_condition: str
    seal_condition: str
    display_condition: str
    remarks: Optional[str] = None
    reference_value: Optional[float] = None
    observed_value: Optional[float] = None
    error_value: Optional[float] = None
    percentage_error: Optional[float] = None
    applied_rule_id: Optional[str] = None
    applied_rule_version: Optional[str] = None
    applied_limit: Optional[float] = None
    applied_limit_type: Optional[LimitType] = None
    result: Optional[VerificationResult] = None
    failure_reason: Optional[str] = None
    corrective_action: Optional[str] = None
    verification_lat: Optional[float] = None
    verification_lng: Optional[float] = None
    gps_accuracy: Optional[float] = None
    is_submitted: bool
    submitted_at: Optional[datetime.datetime] = None
    evidences: List[EvidenceResponse] = []
    certificate_id: Optional[int] = None
    certificate_number: Optional[str] = None

    class Config:
        from_attributes = True

# ----------------- CERTIFICATE -----------------
class CertificateResponse(BaseModel):
    id: int
    certificate_number: str
    instrument_id: int
    instrument_uid: Optional[str] = None
    instrument_type: Optional[str] = None
    owner_name: Optional[str] = None
    issue_date: datetime.datetime
    expiry_date: datetime.datetime
    verification_period_days: int
    verifier_id: int
    verifier_name: Optional[str] = None
    verifier_role: RoleEnum
    sha256_hash: str
    display_fingerprint: str
    qr_code_url: Optional[str] = None
    pdf_url: Optional[str] = None
    validity_status: ValidityStatus
    applied_rule_id: Optional[str] = None
    applied_rule_version: Optional[str] = None
    permissible_limit: Optional[float] = None
    disclaimer: str

    class Config:
        from_attributes = True

class CertificateIntegrityResponse(BaseModel):
    certificate_number: str
    stored_hash: str
    computed_hash: str
    canonical_string: str
    integrity_status: str # "VERIFIED" or "INTEGRITY_COMPROMISED"
    is_valid: bool
    checked_at: datetime.datetime

# ----------------- PUBLIC QR (PRIVACY-SAFE) -----------------
class PublicQRResponse(BaseModel):
    certificate_number: str
    instrument_masked_id: str
    instrument_type: str
    accuracy_class: Optional[str] = None
    verification_date: datetime.datetime
    expiry_date: datetime.datetime
    validity_status: ValidityStatus
    result: str # "VERIFIED"
    verifier_type: RoleEnum
    integrity_status: str # "VERIFIED" or "INTEGRITY_COMPROMISED"
    display_fingerprint: str
    disclaimer: str
    # STRICT PRIVACY: NO GPS, NO OWNER PII, NO EVIDENCE PHOTOS

# ----------------- RULES ENGINE -----------------
class RuleCreate(BaseModel):
    rule_id: str
    instrument_type: str
    accuracy_class: Optional[str] = None
    test_parameter: str = "Measurement Error"
    permissible_limit_value: float
    limit_type: LimitType = LimitType.PERCENTAGE
    verification_period_days: int = 365
    source: str = "Demonstration Configuration"
    version: str = "DEMO-1.0"
    effective_from: Optional[datetime.datetime] = None
    effective_to: Optional[datetime.datetime] = None
    is_active: bool = True

class RuleUpdate(BaseModel):
    permissible_limit_value: Optional[float] = None
    limit_type: Optional[LimitType] = None
    verification_period_days: Optional[int] = None
    version: Optional[str] = None
    source: Optional[str] = None
    is_active: Optional[bool] = None

class RuleResponse(RuleCreate):
    id: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# ----------------- FEE ENGINE -----------------
class FeeConfigCreate(BaseModel):
    fee_id: str
    category_type: str
    component_name: str = "Standard Verification Fee"
    amount: float
    version: str = "DEMO-1.0"
    source: str = "Demonstration / Indicative Fee Configuration"
    is_active: bool = True

class FeeConfigUpdate(BaseModel):
    amount: Optional[float] = None
    component_name: Optional[str] = None
    version: Optional[str] = None
    source: Optional[str] = None
    is_active: Optional[bool] = None

class FeeConfigResponse(FeeConfigCreate):
    id: int
    effective_date: datetime.datetime
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# ----------------- NOTIFICATIONS -----------------
class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    notification_type: str
    instrument_id: Optional[int] = None
    instrument_uid: Optional[str] = None
    certificate_id: Optional[int] = None
    certificate_number: Optional[str] = None
    read_status: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# ----------------- AUDIT LOG -----------------
class AuditLogResponse(BaseModel):
    id: int
    timestamp: datetime.datetime
    actor_id: Optional[int] = None
    actor_name: str
    actor_role: str
    event_type: str
    entity_name: str
    entity_id: str
    metadata_json: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

# ----------------- DASHBOARD METRICS -----------------
class DashboardMetrics(BaseModel):
    total_instruments: int = 0
    pending_applications: int = 0
    assigned_applications: int = 0
    scheduled_verifications: int = 0
    under_verification: int = 0
    certificates_issued: int = 0
    expiring_certificates: int = 0
    expired_instruments: int = 0
    reverification_required: int = 0
    failed_verifications: int = 0
