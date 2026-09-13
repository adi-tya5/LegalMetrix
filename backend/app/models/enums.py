import enum

class RoleEnum(str, enum.Enum):
    USER = "USER"
    LMO = "LMO"
    GATC = "GATC"
    ADMIN = "ADMIN"

class WorkflowState(str, enum.Enum):
    DRAFT = "DRAFT"
    PAYMENT_PENDING = "PAYMENT_PENDING"
    PAYMENT_COMPLETED = "PAYMENT_COMPLETED"
    SUBMITTED = "SUBMITTED"
    LMO_ASSIGNED = "LMO_ASSIGNED"
    VERIFICATION_SCHEDULED = "VERIFICATION_SCHEDULED"
    UNDER_VERIFICATION = "UNDER_VERIFICATION"
    CERTIFICATE_ISSUED = "CERTIFICATE_ISSUED"
    RE_VERIFICATION_REQUIRED = "RE_VERIFICATION_REQUIRED"

class VerificationResult(str, enum.Enum):
    PASS = "PASS"
    FAIL = "FAIL"

class LimitType(str, enum.Enum):
    PERCENTAGE = "PERCENTAGE"
    ABSOLUTE = "ABSOLUTE"

class ValidityStatus(str, enum.Enum):
    VALID = "VALID"
    EXPIRING_SOON = "EXPIRING_SOON"
    EXPIRED = "EXPIRED"
    RE_VERIFICATION_REQUIRED = "RE_VERIFICATION_REQUIRED"
    INTEGRITY_COMPROMISED = "INTEGRITY_COMPROMISED"
    INVALID_CERTIFICATE = "INVALID_CERTIFICATE"

class EvidenceCategory(str, enum.Enum):
    FRONT_VIEW = "Instrument Front View"
    DISPLAY = "Display"
    SERIAL_PLATE = "Serial/ID Plate"
    SEAL_SECURITY = "Seal/Security Mark"
    TEST_SETUP = "Test Setup"
    OTHER = "Other"

class ApplicationType(str, enum.Enum):
    INITIAL = "INITIAL"
    RE_VERIFICATION = "RE_VERIFICATION"

class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
