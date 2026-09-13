import pytest
from app.models.models import Rule, Certificate, Instrument, Verification, Application
from app.models.enums import VerificationResult, WorkflowState, LimitType
from app.services.calculation_engine import preview_calculation
from app.services.certificate_service import verify_certificate_integrity

def test_case_1_and_case_2_verification_calculations(client, db):
    """
    Case 1: Reference 1000, Observed 1001.5 -> Expected: +0.15%, PASS with ±0.50% demo rule
    Case 2: Reference 1000, Observed 1008 -> Expected: +0.80%, FAIL with ±0.50% demo rule
    """
    # Case 1: PASS
    res1 = client.post("/api/v1/verifications/preview-calc", json={
        "instrument_type": "Digital Weighing Machine",
        "accuracy_class": "Demo",
        "test_parameter": "Measurement Error",
        "reference_value": 1000.0,
        "observed_value": 1001.5
    })
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["percentage_error"] == 0.15
    assert data1["result"] == "PASS"

    # Case 2: FAIL
    res2 = client.post("/api/v1/verifications/preview-calc", json={
        "instrument_type": "Digital Weighing Machine",
        "accuracy_class": "Demo",
        "test_parameter": "Measurement Error",
        "reference_value": 1000.0,
        "observed_value": 1008.0
    })
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["percentage_error"] == 0.80
    assert data2["result"] == "FAIL"

def test_case_3_change_rule_and_retest(client, db, admin_headers):
    """
    Case 3: Change demo rule to ±0.10%. Case 1 should now become FAIL.
    Then restore ±0.50%.
    """
    # 1. Update rule to ±0.10%
    up_res = client.put(
        "/api/v1/rules/RULE-DWM-001",
        headers=admin_headers,
        json={"permissible_limit_value": 0.10}
    )
    assert up_res.status_code == 200
    assert up_res.json()["permissible_limit_value"] == 0.10

    # 2. Re-test Case 1 (1000 -> 1001.5 = +0.15%)
    res = client.post("/api/v1/verifications/preview-calc", json={
        "instrument_type": "Digital Weighing Machine",
        "accuracy_class": "Demo",
        "test_parameter": "Measurement Error",
        "reference_value": 1000.0,
        "observed_value": 1001.5
    })
    assert res.status_code == 200
    data = res.json()
    assert data["percentage_error"] == 0.15
    # Since 0.15% > 0.10%, result MUST now be FAIL!
    assert data["result"] == "FAIL"

    # 3. Restore demo rule back to ±0.50%
    restore_res = client.put(
        "/api/v1/rules/RULE-DWM-001",
        headers=admin_headers,
        json={"permissible_limit_value": 0.50}
    )
    assert restore_res.status_code == 200
    assert restore_res.json()["permissible_limit_value"] == 0.50

def test_case_4_fee_manipulation_rejection(client, db, user_headers):
    """
    Case 4: Frontend sends manipulated fee (e.g. ₹10 instead of configured ₹800).
    Backend must enforce the configured authoritative fee.
    """
    # Look up application in PAYMENT_PENDING or create one
    inst = db.query(Instrument).filter(Instrument.category == "Standard").first()
    
    app_res = client.post(
        "/api/v1/applications/",
        headers=user_headers,
        json={"instrument_id": inst.id}
    )
    assert app_res.status_code == 200
    app_id = app_res.json()["id"]

    # Client tries to send manipulated fee of ₹10
    pay_res = client.post(
        "/api/v1/payments/process",
        headers=user_headers,
        json={
            "application_id": app_id,
            "submitted_amount": 10.0, # Manipulated client amount!
            "payment_method": "DEMO_NETBANKING"
        }
    )
    assert pay_res.status_code == 200
    pay_data = pay_res.json()
    # Backend MUST enforce authoritative ₹800.0, NOT ₹10.0
    assert pay_data["amount_paid"] == 800.0

def test_case_5_tamper_detection(client, db, user_headers):
    """
    Case 5: Alter certificate data after generation.
    Integrity endpoint must return INTEGRITY_COMPROMISED.
    """
    cert = db.query(Certificate).first()
    assert cert is not None
    cert_no = cert.certificate_number

    # First check integrity is VERIFIED
    chk_res = client.get(f"/api/v1/certificates/{cert_no}/verify-integrity", headers=user_headers)
    assert chk_res.status_code == 200
    assert chk_res.json()["integrity_status"] == "VERIFIED"

    # Now simulate tampering directly in DB (e.g. changing verification result or dates)
    original_expiry = cert.expiry_date
    cert.expiry_date = cert.expiry_date.replace(year=2030) # Tamper with expiry
    db.commit()

    # Integrity verification must detect tampering!
    tamper_res = client.get(f"/api/v1/certificates/{cert_no}/verify-integrity", headers=user_headers)
    assert tamper_res.status_code == 200
    assert tamper_res.json()["integrity_status"] == "INTEGRITY_COMPROMISED"
    assert tamper_res.json()["is_valid"] is False

    # Restore original date
    cert.expiry_date = original_expiry
    db.commit()

def test_case_6_and_7_public_qr_privacy_and_no_auth(client):
    """
    Case 6: Public QR endpoint requires NO authentication token.
    Case 7: Public QR must NOT reveal GPS coordinates, raw evidence photos, or private contact info.
    """
    cert_no = "CERT-MH-001-0001"
    # Call WITHOUT any Authorization header
    res = client.get(f"/verify/{cert_no}")
    assert res.status_code == 200
    data = res.json()

    # Case 6: Accessible without auth
    assert data["certificate_number"] == cert_no
    assert data["result"] == "VERIFIED"
    assert data["integrity_status"] == "VERIFIED"

    # Case 7: Privacy safeguards
    # Should NOT have phone, email, gps, or raw photos
    assert "phone" not in data
    assert "email" not in data
    assert "latitude" not in data
    assert "longitude" not in data
    assert "evidences" not in data
    # Masked UID check
    assert "****" in data["instrument_masked_id"]

def test_case_8_and_9_certificate_immutability(client, user_headers, admin_headers):
    """
    Case 8: PUT certificate -> 405 Method Not Allowed
    Case 9: DELETE certificate -> 405 Method Not Allowed
    """
    cert_no = "CERT-MH-001-0001"

    # PUT
    put_res = client.put(f"/api/v1/certificates/{cert_no}", headers=admin_headers)
    assert put_res.status_code == 405

    # DELETE
    del_res = client.delete(f"/api/v1/certificates/{cert_no}", headers=admin_headers)
    assert del_res.status_code == 405

def test_case_10_failed_verification_generates_no_certificate(client, db):
    """
    Case 10: Failed verification yields NO certificate, and status becomes RE_VERIFICATION_REQUIRED.
    """
    ver_failed = db.query(Verification).filter(Verification.result == VerificationResult.FAIL).first()
    assert ver_failed is not None
    # Ensure no certificate exists linked to this verification
    assert ver_failed.certificate is None

    app_failed = ver_failed.application
    assert app_failed.current_status == WorkflowState.RE_VERIFICATION_REQUIRED

def test_case_11_reverification_preserves_historical_certificate(client, db, user_headers):
    """
    Case 11: Re-verification on expired or expiring instrument creates a new application
    while preserving the historical certificate intact.
    """
    inst = db.query(Instrument).filter(Instrument.instrument_uid == "INST-2026-0003").first()
    old_certs_count = len(inst.certificates)
    assert old_certs_count >= 1

    old_cert_id = inst.certificates[0].id
    old_cert_num = inst.certificates[0].certificate_number

    # Initiate re-verification
    rever_res = client.post(
        "/api/v1/reverification/start",
        headers=user_headers,
        json={"instrument_id": inst.id, "notes": "Periodic statutory re-verification"}
    )
    assert rever_res.status_code == 200
    new_app = rever_res.json()
    assert new_app["application_type"] == "RE_VERIFICATION"
    assert new_app["current_status"] == "SUBMITTED"

    # Check that old certificate is still intact in DB and unchanged
    cert_in_db = db.query(Certificate).filter(Certificate.id == old_cert_id).first()
    assert cert_in_db is not None
    assert cert_in_db.certificate_number == old_cert_num
