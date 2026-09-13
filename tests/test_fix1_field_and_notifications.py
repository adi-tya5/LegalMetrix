import pytest
from app.models.models import Application, Verification, Certificate, Instrument, User, Notification
from app.models.enums import WorkflowState, RoleEnum, VerificationResult
from app.services.notification_service import evaluate_and_generate_notifications

def test_field_verification_list_endpoint_and_scoping(client, lmo_headers, gatc_headers, user_headers):
    # LMO gets their own verifications
    res_lmo = client.get("/api/v1/verifications/", headers=lmo_headers)
    assert res_lmo.status_code == 200
    lmo_data = res_lmo.json()
    assert isinstance(lmo_data, list)
    for v in lmo_data:
        assert v["verifier_role"] == "LMO"

    # GATC gets their own verifications
    res_gatc = client.get("/api/v1/verifications/", headers=gatc_headers)
    assert res_gatc.status_code == 200
    gatc_data = res_gatc.json()
    assert isinstance(gatc_data, list)
    for v in gatc_data:
        assert v["verifier_role"] == "GATC"

def test_field_verification_metadata_fields_populated(client, lmo_headers, db):
    # Retrieve existing verification
    ver = db.query(Verification).filter(Verification.verifier_role == RoleEnum.LMO).first()
    assert ver is not None

    res = client.get(f"/api/v1/verifications/{ver.id}", headers=lmo_headers)
    assert res.status_code == 200
    data = res.json()

    # Verify all 12 metadata fields are present and populated
    assert "application_id" in data and data["application_id"] is not None
    assert "application_number" in data and data["application_number"] is not None
    assert "instrument_id" in data and data["instrument_id"] is not None
    assert "instrument_uid" in data and data["instrument_uid"] is not None
    assert "instrument_type" in data and data["instrument_type"] is not None
    assert "manufacturer" in data and data["manufacturer"] is not None
    assert "model_number" in data and data["model_number"] is not None
    assert "serial_number" in data and data["serial_number"] is not None
    assert "max_capacity" in data and data["max_capacity"] is not None
    assert "unit" in data and data["unit"] is not None
    assert "accuracy_class" in data and data["accuracy_class"] is not None
    assert "applicant_name" in data and data["applicant_name"] is not None
    assert "verifier_name" in data and data["verifier_name"] is not None
    assert "verifier_role" in data and data["verifier_role"] == "LMO"

def test_field_verification_start_transitions_to_under_verification(client, lmo_headers, db):
    lmo_user = db.query(User).filter(User.role == RoleEnum.LMO).first()
    # Find scheduled application for LMO
    app = db.query(Application).filter(
        Application.assigned_user_id == lmo_user.id,
        Application.current_status == WorkflowState.VERIFICATION_SCHEDULED
    ).first()

    if not app:
        # Create one if not present
        inst = db.query(Instrument).first()
        app = Application(
            application_number="APP-TEST-001",
            instrument_id=inst.id,
            applicant_id=inst.owner_id,
            current_status=WorkflowState.VERIFICATION_SCHEDULED,
            assigned_role=RoleEnum.LMO,
            assigned_user_id=lmo_user.id
        )
        db.add(app)
        db.commit()
        db.refresh(app)

    res = client.post("/api/v1/verifications/start", json={"application_id": app.id}, headers=lmo_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["application_id"] == app.id
    assert data["verifier_id"] == lmo_user.id

    # Verify state transitioned
    db.refresh(app)
    assert app.current_status == WorkflowState.UNDER_VERIFICATION

def test_field_verification_start_idempotent(client, lmo_headers, db):
    lmo_user = db.query(User).filter(User.role == RoleEnum.LMO).first()
    app = db.query(Application).filter(
        Application.assigned_user_id == lmo_user.id,
        Application.current_status == WorkflowState.UNDER_VERIFICATION
    ).first()
    assert app is not None

    # Call start again
    res1 = client.post("/api/v1/verifications/start", json={"application_id": app.id}, headers=lmo_headers)
    res2 = client.post("/api/v1/verifications/start", json={"application_id": app.id}, headers=lmo_headers)
    assert res1.status_code == 200
    assert res2.status_code == 200
    # Must return identical verification record
    assert res1.json()["id"] == res2.json()["id"]

def test_gatc_can_access_and_submit_verification(client, gatc_headers, db):
    gatc_user = db.query(User).filter(User.role == RoleEnum.GATC).first()
    app = db.query(Application).filter(
        Application.assigned_user_id == gatc_user.id,
        Application.current_status == WorkflowState.VERIFICATION_SCHEDULED
    ).first()
    assert app is not None

    # GATC starts inspection
    res_start = client.post("/api/v1/verifications/start", json={"application_id": app.id}, headers=gatc_headers)
    assert res_start.status_code == 200
    ver_id = res_start.json()["id"]

    # GATC submits verification (Pass)
    payload = {
        "identity_confirmed": True,
        "physical_condition": "Good",
        "seal_condition": "Intact",
        "display_condition": "Clear and Legible",
        "remarks": "GATC Lab testing completed with precision reference standard.",
        "reference_value": 200.0,
        "observed_value": 200.05,
        "verification_lat": 19.0765,
        "verification_lng": 72.9988,
        "gps_accuracy": 3.0
    }
    res_submit = client.post(f"/api/v1/verifications/{ver_id}/submit", json=payload, headers=gatc_headers)
    assert res_submit.status_code == 200
    submit_data = res_submit.json()
    assert submit_data["result"] == "PASS"
    assert submit_data["certificate_number"] is not None

def test_verification_fail_requires_reason_and_action(client, lmo_headers, db):
    lmo_user = db.query(User).filter(User.role == RoleEnum.LMO).first()
    # Create application for fail test
    inst = db.query(Instrument).first()
    app = Application(
        application_number="APP-FAIL-TEST",
        instrument_id=inst.id,
        applicant_id=inst.owner_id,
        current_status=WorkflowState.VERIFICATION_SCHEDULED,
        assigned_role=RoleEnum.LMO,
        assigned_user_id=lmo_user.id
    )
    db.add(app)
    db.commit()
    db.refresh(app)

    res_start = client.post("/api/v1/verifications/start", json={"application_id": app.id}, headers=lmo_headers)
    ver_id = res_start.json()["id"]

    # Submit with out-of-tolerance reading and no failure reason
    payload_missing_reason = {
        "identity_confirmed": True,
        "physical_condition": "Good",
        "seal_condition": "Intact",
        "display_condition": "Clear and Legible",
        "remarks": "Defective load cell test",
        "reference_value": 1000.0,
        "observed_value": 1050.0, # 5% error, exceeds limit
        "failure_reason": "", # Missing
        "corrective_action": "Fix sensor"
    }
    res_fail_missing = client.post(f"/api/v1/verifications/{ver_id}/submit", json=payload_missing_reason, headers=lmo_headers)
    assert res_fail_missing.status_code == 400

    # Submit with valid failure reason and corrective action
    payload_valid_fail = {
        "identity_confirmed": True,
        "physical_condition": "Good",
        "seal_condition": "Intact",
        "display_condition": "Clear and Legible",
        "remarks": "Defective load cell test",
        "reference_value": 1000.0,
        "observed_value": 1050.0,
        "failure_reason": "Error of +5.0% exceeds allowable demo tolerance limit.",
        "corrective_action": "Recalibrate load cell amplifier and re-apply."
    }
    res_fail_valid = client.post(f"/api/v1/verifications/{ver_id}/submit", json=payload_valid_fail, headers=lmo_headers)
    assert res_fail_valid.status_code == 200
    assert res_fail_valid.json()["result"] == "FAIL"

    # Verify state is RE_VERIFICATION_REQUIRED and no certificate was issued
    db.refresh(app)
    assert app.current_status == WorkflowState.RE_VERIFICATION_REQUIRED
    cert = db.query(Certificate).filter(Certificate.verification_id == ver_id).first()
    assert cert is None

def test_notification_generation_from_real_data(client, db, user_headers):
    # Trigger dynamic generation
    generated = evaluate_and_generate_notifications(db)
    assert isinstance(generated, list)

    # Check that EXPIRY_SOON, EXPIRED, and RE_VERIFICATION_REQUIRED exist
    notifs = db.query(Notification).all()
    types = {n.notification_type for n in notifs}
    assert "EXPIRY_SOON" in types
    assert "EXPIRED" in types
    assert "RE_VERIFICATION_REQUIRED" in types

    # Check notification structure has instrument and certificate links
    expiry_soon_n = db.query(Notification).filter(Notification.notification_type == "EXPIRY_SOON").first()
    assert expiry_soon_n is not None
    assert expiry_soon_n.instrument_uid is not None
    assert expiry_soon_n.certificate_number is not None
    assert expiry_soon_n.dedup_key is not None

def test_notification_deduplication_integrity(db):
    # Initial count
    count_before = db.query(Notification).count()

    # Re-run generator multiple times
    evaluate_and_generate_notifications(db)
    evaluate_and_generate_notifications(db)
    evaluate_and_generate_notifications(db)

    count_after = db.query(Notification).count()
    # Count must remain exactly equal (no duplicate notifications created)
    assert count_before == count_after

def test_notification_list_scoping_for_owner(client, user_headers, db):
    user = db.query(User).filter(User.role == RoleEnum.USER).first()
    res = client.get("/api/v1/notifications/", headers=user_headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) > 0
    # Every notification returned must belong to this user
    for n in data:
        assert n["user_id"] == user.id

def test_notification_mark_read(client, user_headers, db):
    user = db.query(User).filter(User.role == RoleEnum.USER).first()
    notif = db.query(Notification).filter(
        Notification.user_id == user.id,
        Notification.read_status == False
    ).first()
    assert notif is not None

    res = client.post(f"/api/v1/notifications/{notif.id}/read", headers=user_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

    db.refresh(notif)
    assert notif.read_status is True

def test_notification_mark_all_read(client, user_headers, db):
    user = db.query(User).filter(User.role == RoleEnum.USER).first()
    res = client.post("/api/v1/notifications/mark-all-read", headers=user_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

    # Verify all unread notifications for this user are now read
    unread = db.query(Notification).filter(
        Notification.user_id == user.id,
        Notification.read_status == False
    ).count()
    assert unread == 0

def test_notification_check_endpoint(client, user_headers):
    res = client.post("/api/v1/notifications/check", headers=user_headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)

def test_notification_unread_only_filter(client, user_headers, db):
    user = db.query(User).filter(User.role == RoleEnum.USER).first()
    # Create one unread notification
    new_notif = Notification(
        user_id=user.id,
        notification_type="EXPIRY_SOON",
        title="Unread Test Notice",
        message="Test unread filtering",
        read_status=False
    )
    db.add(new_notif)
    db.commit()

    res_all = client.get("/api/v1/notifications/", headers=user_headers)
    res_unread = client.get("/api/v1/notifications/?unread_only=true", headers=user_headers)
    assert res_all.status_code == 200
    assert res_unread.status_code == 200

    unread_items = res_unread.json()
    for item in unread_items:
        assert item["read_status"] is False

def test_notification_role_isolation(client, user_headers, lmo_headers, admin_headers, db):
    # Admin sees all notifications
    res_admin = client.get("/api/v1/notifications/", headers=admin_headers)
    assert res_admin.status_code == 200
    admin_notifs = res_admin.json()

    # User sees only their notifications
    res_user = client.get("/api/v1/notifications/", headers=user_headers)
    assert res_user.status_code == 200
    user_notifs = res_user.json()

    # Admin count should be >= User count
    assert len(admin_notifs) >= len(user_notifs)

def test_gps_boundary_validation_rejects_out_of_range(client, lmo_headers, db):
    lmo_user = db.query(User).filter(User.role == RoleEnum.LMO).first()
    inst = db.query(Instrument).first()
    app = Application(
        application_number="APP-GPS-TEST-1",
        instrument_id=inst.id,
        applicant_id=inst.owner_id,
        current_status=WorkflowState.VERIFICATION_SCHEDULED,
        assigned_role=RoleEnum.LMO,
        assigned_user_id=lmo_user.id
    )
    db.add(app)
    db.commit()

    start_res = client.post("/api/v1/verifications/start", json={"application_id": app.id}, headers=lmo_headers)
    assert start_res.status_code == 200
    ver_id = start_res.json()["id"]

    base_payload = {
        "identity_confirmed": True,
        "physical_condition": "Good",
        "seal_condition": "Intact",
        "display_condition": "Clear and Legible",
        "reference_value": 1000.0,
        "observed_value": 1000.5,
    }

    # Test latitude > 90.0
    res = client.post(f"/api/v1/verifications/{ver_id}/submit", json={**base_payload, "verification_lat": 95.0, "verification_lng": 72.0}, headers=lmo_headers)
    assert res.status_code == 422

    # Test latitude < -90.0
    res = client.post(f"/api/v1/verifications/{ver_id}/submit", json={**base_payload, "verification_lat": -91.5, "verification_lng": 72.0}, headers=lmo_headers)
    assert res.status_code == 422

    # Test longitude > 180.0
    res = client.post(f"/api/v1/verifications/{ver_id}/submit", json={**base_payload, "verification_lat": 19.0, "verification_lng": 185.0}, headers=lmo_headers)
    assert res.status_code == 422

    # Test longitude < -180.0
    res = client.post(f"/api/v1/verifications/{ver_id}/submit", json={**base_payload, "verification_lat": 19.0, "verification_lng": -185.0}, headers=lmo_headers)
    assert res.status_code == 422

    # Test accuracy < 0
    res = client.post(f"/api/v1/verifications/{ver_id}/submit", json={**base_payload, "verification_lat": 19.0, "verification_lng": 72.0, "gps_accuracy": -5.0}, headers=lmo_headers)
    assert res.status_code == 422

def test_gps_is_completely_optional_and_generates_certificate(client, lmo_headers, db):
    lmo_user = db.query(User).filter(User.role == RoleEnum.LMO).first()
    inst = db.query(Instrument).first()
    app = Application(
        application_number="APP-GPS-TEST-2",
        instrument_id=inst.id,
        applicant_id=inst.owner_id,
        current_status=WorkflowState.VERIFICATION_SCHEDULED,
        assigned_role=RoleEnum.LMO,
        assigned_user_id=lmo_user.id
    )
    db.add(app)
    db.commit()

    start_res = client.post("/api/v1/verifications/start", json={"application_id": app.id}, headers=lmo_headers)
    assert start_res.status_code == 200
    ver_id = start_res.json()["id"]

    # Completely omit GPS fields
    payload_no_gps = {
        "identity_confirmed": True,
        "physical_condition": "Good",
        "seal_condition": "Intact",
        "display_condition": "Clear and Legible",
        "remarks": "Verified without GPS coordinates - field test optionality",
        "reference_value": 1000.0,
        "observed_value": 1000.5,
        "verification_lat": None,
        "verification_lng": None,
        "gps_accuracy": None
    }

    res_submit = client.post(f"/api/v1/verifications/{ver_id}/submit", json=payload_no_gps, headers=lmo_headers)
    assert res_submit.status_code == 200
    data = res_submit.json()
    assert data["result"] == "PASS"
    assert data["verification_lat"] is None
    assert data["verification_lng"] is None
    assert data["certificate_number"] is not None

    # Verify certificate was generated properly
    cert = db.query(Certificate).filter(Certificate.verification_id == ver_id).first()
    assert cert is not None
    assert cert.sha256_hash is not None

