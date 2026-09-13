import hashlib
import datetime
from typing import Tuple, Dict, Any
from app.models.models import Certificate, Verification, Instrument

def generate_canonical_string(
    certificate_number: str,
    instrument_uid: str,
    verification_number: str,
    issue_date: datetime.datetime,
    expiry_date: datetime.datetime,
    result: str,
    applied_rule_id: str,
    applied_rule_version: str
) -> str:
    """
    Builds deterministic canonical string for SHA-256 hashing.
    Format:
    cert_no|inst_uid|ver_no|issue_date_iso|expiry_date_iso|result|rule_id|rule_ver
    """
    issue_str = issue_date.strftime("%Y-%m-%d")
    expiry_str = expiry_date.strftime("%Y-%m-%d")
    
    canonical = (
        f"{certificate_number.strip()}|"
        f"{instrument_uid.strip()}|"
        f"{verification_number.strip()}|"
        f"{issue_str}|"
        f"{expiry_str}|"
        f"{str(result).strip().upper()}|"
        f"{str(applied_rule_id).strip()}|"
        f"{str(applied_rule_version).strip()}"
    )
    return canonical

def compute_sha256_hash(canonical_str: str) -> Tuple[str, str]:
    """
    Computes deterministic SHA-256 hash and human-readable 16-char fingerprint.
    Fingerprint format: XXXX-XXXX-XXXX-XXXX
    """
    sha256_hex = hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()
    # Create clean 4-block display fingerprint from first 16 chars uppercase
    fp_raw = sha256_hex[:16].upper()
    display_fingerprint = f"{fp_raw[0:4]}-{fp_raw[4:8]}-{fp_raw[8:12]}-{fp_raw[12:16]}"
    return sha256_hex, display_fingerprint

def verify_certificate_integrity(certificate: Certificate) -> Dict[str, Any]:
    """
    Recalculates deterministic hash from canonical certificate data
    and compares against the stored SHA-256 hash.
    Returns VERIFIED or INTEGRITY_COMPROMISED.
    """
    inst_uid = certificate.instrument.instrument_uid if certificate.instrument else ""
    ver_no = certificate.verification.verification_number if certificate.verification else ""
    rule_id = certificate.verification.applied_rule_id if certificate.verification else ""
    rule_ver = certificate.verification.applied_rule_version if certificate.verification else ""
    result_val = "VERIFIED"

    computed_canonical = generate_canonical_string(
        certificate_number=certificate.certificate_number,
        instrument_uid=inst_uid,
        verification_number=ver_no,
        issue_date=certificate.issue_date,
        expiry_date=certificate.expiry_date,
        result=result_val,
        applied_rule_id=rule_id,
        applied_rule_version=rule_ver
    )

    computed_hash, _ = compute_sha256_hash(computed_canonical)
    
    is_intact = (computed_hash == certificate.sha256_hash)
    integrity_status = "VERIFIED" if is_intact else "INTEGRITY_COMPROMISED"

    return {
        "certificate_number": certificate.certificate_number,
        "stored_hash": certificate.sha256_hash,
        "computed_hash": computed_hash,
        "canonical_string": computed_canonical,
        "integrity_status": integrity_status,
        "is_valid": is_intact,
        "checked_at": datetime.datetime.utcnow()
    }
