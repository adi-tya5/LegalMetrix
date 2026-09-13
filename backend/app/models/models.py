import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.enums import (
    RoleEnum, WorkflowState, VerificationResult, LimitType,
    EvidenceCategory, ApplicationType, PaymentStatus
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(200), nullable=False)
    role = Column(SAEnum(RoleEnum), nullable=False, default=RoleEnum.USER)
    organization = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    instruments = relationship("Instrument", back_populates="owner", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="applicant", foreign_keys="Application.applicant_id")
    assigned_applications = relationship("Application", back_populates="assigned_verifier", foreign_keys="Application.assigned_user_id")
    verifications = relationship("Verification", back_populates="verifier")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class Instrument(Base):
    __tablename__ = "instruments"

    id = Column(Integer, primary_key=True, index=True)
    instrument_uid = Column(String(100), unique=True, index=True, nullable=False) # e.g. INST-2026-0001
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    instrument_type = Column(String(150), nullable=False) # e.g. Digital Weighing Machine
    category = Column(String(100), nullable=False) # e.g. Standard, Platform, Precision, Heavy Weighbridge
    manufacturer = Column(String(150), nullable=False)
    model_number = Column(String(100), nullable=False)
    serial_number = Column(String(100), index=True, nullable=False)
    max_capacity = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False, default="kg")
    accuracy_class = Column(String(50), nullable=True) # Class I, Class II, Class III, Demo
    location_address = Column(Text, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="instruments")
    applications = relationship("Application", back_populates="instrument", cascade="all, delete-orphan")
    verifications = relationship("Verification", back_populates="instrument", cascade="all, delete-orphan")
    certificates = relationship("Certificate", back_populates="instrument", cascade="all, delete-orphan")


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    application_number = Column(String(100), unique=True, index=True, nullable=False) # APP-2026-0001
    instrument_id = Column(Integer, ForeignKey("instruments.id"), nullable=False)
    applicant_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    application_type = Column(SAEnum(ApplicationType), default=ApplicationType.INITIAL)
    current_status = Column(SAEnum(WorkflowState), default=WorkflowState.DRAFT, nullable=False, index=True)
    
    # Authoritative Fee calculation
    fee_amount = Column(Float, nullable=False, default=0.0)
    payment_status = Column(SAEnum(PaymentStatus), default=PaymentStatus.PENDING)
    
    # Verifier allocation
    assigned_role = Column(SAEnum(RoleEnum), nullable=True) # RoleEnum.LMO or RoleEnum.GATC
    assigned_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Scheduling
    scheduled_date = Column(DateTime, nullable=True)
    scheduled_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    instrument = relationship("Instrument", back_populates="applications")
    applicant = relationship("User", foreign_keys=[applicant_id], back_populates="applications")
    assigned_verifier = relationship("User", foreign_keys=[assigned_user_id], back_populates="assigned_applications")
    payment = relationship("Payment", uselist=False, back_populates="application", cascade="all, delete-orphan")
    verifications = relationship("Verification", back_populates="application", cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="application", cascade="all, delete-orphan")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    payment_reference = Column(String(100), unique=True, index=True, nullable=False) # PAY-2026-XXXX
    application_id = Column(Integer, ForeignKey("applications.id"), unique=True, nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(SAEnum(PaymentStatus), default=PaymentStatus.PENDING)
    payment_method = Column(String(50), default="DEMO_NETBANKING")
    gateway_response = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    application = relationship("Application", back_populates="payment")


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    assigned_role = Column(SAEnum(RoleEnum), nullable=False)
    assigned_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_by_admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    scheduled_date = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    application = relationship("Application", back_populates="assignments")


class Verification(Base):
    __tablename__ = "verifications"

    id = Column(Integer, primary_key=True, index=True)
    verification_number = Column(String(100), unique=True, index=True, nullable=False) # VER-2026-XXXX
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    instrument_id = Column(Integer, ForeignKey("instruments.id"), nullable=False)
    verifier_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    verifier_role = Column(SAEnum(RoleEnum), nullable=False)
    verification_date = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Checklist / Inspection condition
    identity_confirmed = Column(Boolean, default=True)
    physical_condition = Column(String(100), default="Good")
    seal_condition = Column(String(100), default="Intact")
    display_condition = Column(String(100), default="Clear and Legible")
    remarks = Column(Text, nullable=True)
    
    # Test Data
    reference_value = Column(Float, nullable=True)
    observed_value = Column(Float, nullable=True)
    error_value = Column(Float, nullable=True)
    percentage_error = Column(Float, nullable=True)
    
    # Applied Rule Details (snapshot for immutability)
    applied_rule_id = Column(String(100), nullable=True)
    applied_rule_version = Column(String(50), nullable=True)
    applied_limit = Column(Float, nullable=True)
    applied_limit_type = Column(SAEnum(LimitType), default=LimitType.PERCENTAGE)
    applied_period_days = Column(Integer, default=365)
    
    # Result
    result = Column(SAEnum(VerificationResult), nullable=True)
    failure_reason = Column(Text, nullable=True)
    corrective_action = Column(Text, nullable=True)
    
    # Optional GPS
    verification_lat = Column(Float, nullable=True)
    verification_lng = Column(Float, nullable=True)
    gps_accuracy = Column(Float, nullable=True)
    gps_timestamp = Column(DateTime, nullable=True)
    
    # Immutability lock
    is_submitted = Column(Boolean, default=False)
    submitted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    application = relationship("Application", back_populates="verifications")
    instrument = relationship("Instrument", back_populates="verifications")
    verifier = relationship("User", back_populates="verifications")
    evidences = relationship("Evidence", back_populates="verification", cascade="all, delete-orphan")
    certificate = relationship("Certificate", uselist=False, back_populates="verification")


class Evidence(Base):
    __tablename__ = "evidences"

    id = Column(Integer, primary_key=True, index=True)
    verification_id = Column(Integer, ForeignKey("verifications.id"), nullable=False)
    category = Column(SAEnum(EvidenceCategory), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False)
    file_size_bytes = Column(Integer, default=0)
    description = Column(Text, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_locked = Column(Boolean, default=False) # Locked permanently once verification is submitted

    # Relationships
    verification = relationship("Verification", back_populates="evidences")


class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, index=True)
    certificate_number = Column(String(100), unique=True, index=True, nullable=False) # CERT-MH-001-XXXX
    verification_id = Column(Integer, ForeignKey("verifications.id"), unique=True, nullable=False)
    instrument_id = Column(Integer, ForeignKey("instruments.id"), nullable=False)
    issue_date = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    expiry_date = Column(DateTime, nullable=False)
    verification_period_days = Column(Integer, nullable=False, default=365)
    verifier_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    verifier_role = Column(SAEnum(RoleEnum), nullable=False)
    
    # SHA-256 canonical integrity
    canonical_data_string = Column(Text, nullable=False)
    sha256_hash = Column(String(64), nullable=False)
    display_fingerprint = Column(String(32), nullable=False) # e.g. ABCD-1234-EFGH
    
    qr_code_path = Column(String(500), nullable=True)
    pdf_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    verification = relationship("Verification", back_populates="certificate")
    instrument = relationship("Instrument", back_populates="certificates")
    verifier = relationship("User")


class Rule(Base):
    __tablename__ = "rules"

    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(String(100), unique=True, index=True, nullable=False) # e.g. RULE-DWM-001
    instrument_type = Column(String(150), nullable=False, index=True)
    accuracy_class = Column(String(50), nullable=True, index=True)
    test_parameter = Column(String(150), nullable=False, default="Measurement Error")
    permissible_limit_value = Column(Float, nullable=False) # e.g. 0.50 (meaning +/- 0.50)
    limit_type = Column(SAEnum(LimitType), default=LimitType.PERCENTAGE)
    verification_period_days = Column(Integer, default=365)
    source = Column(String(255), default="Demonstration Configuration")
    version = Column(String(50), default="DEMO-1.0")
    effective_from = Column(DateTime, default=datetime.datetime.utcnow)
    effective_to = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class FeeConfiguration(Base):
    __tablename__ = "fee_configurations"

    id = Column(Integer, primary_key=True, index=True)
    fee_id = Column(String(100), unique=True, index=True, nullable=False) # FEE-STD-001
    category_type = Column(String(150), nullable=False, index=True) # Standard, Platform, Precision, Heavy Weighbridge
    component_name = Column(String(150), default="Standard Verification Fee")
    amount = Column(Float, nullable=False)
    version = Column(String(50), default="DEMO-1.0")
    effective_date = Column(DateTime, default=datetime.datetime.utcnow)
    source = Column(String(255), default="Demonstration / Indicative Fee Configuration")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), default="SYSTEM") # EXPIRY_SOON, EXPIRED, RE_VERIFICATION_REQUIRED, WORKFLOW
    instrument_id = Column(Integer, nullable=True)
    instrument_uid = Column(String(100), nullable=True)
    certificate_id = Column(Integer, nullable=True)
    certificate_number = Column(String(100), nullable=True)
    dedup_key = Column(String(255), index=True, nullable=True)
    read_status = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notifications")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    actor_id = Column(Integer, nullable=True)
    actor_name = Column(String(150), nullable=False)
    actor_role = Column(String(50), nullable=False)
    event_type = Column(String(100), nullable=False, index=True)
    entity_name = Column(String(100), nullable=False)
    entity_id = Column(String(100), nullable=False)
    metadata_json = Column(JSON, nullable=True)
