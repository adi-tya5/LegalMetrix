import pytest
import datetime
from app.models.models import Instrument, User, Application
from app.models.enums import WorkflowState, RoleEnum

def test_full_9_state_workflow_pass(client, db, user_headers, admin_headers, lmo_headers):
    # 1. Register new instrument
    inst_res = client.post("/api/v1/instruments/", headers=user_headers, json={
        "instrument_type": "Digital Weighing Machine",
        "category": "Standard",
        "manufacturer": "National Instruments Demo",
        "model_number": "NI-2026-X",
        "serial_number": "SN-WORKFLOW-PASS-99",
        "max_capacity": 50.0,
        "unit": "kg",
        "accuracy_class": "Demo",
        "location_address": "Test Facility 1"
    })
    assert inst_res.status_code == 200
    inst_id = inst_res.json()["id"]

    # 2. User creates application -> Starts in PAYMENT_PENDING
    app_res = client.post("/api/v1/applications/", headers=user_headers, json={
        "instrument_id": inst_id
    })
    assert app_res.status_code == 200
    app_data = app_res.json()
    app_id = app_data["id"]
    assert app_data["current_status"] == "PAYMENT_PENDING"

    # 3. Verify that Admin CANNOT allocate application while PAYMENT_PENDING
    lmo_user = db.query(User).filter(User.role == RoleEnum.LMO).first()
    alloc_fail = client.post(
        f"/api/v1/assignments/{app_id}/allocate",
        headers=admin_headers,
        json={
            "assigned_role": "LMO",
            "assigned_user_id": lmo_user.id,
            "scheduled_date": (datetime.datetime.utcnow() + datetime.timedelta(days=2)).isoformat(),
            "notes": "Inspection"
        }
    )
    assert alloc_fail.status_code == 400
    assert "payment-pending" in alloc_fail.json()["detail"].lower()

    # 4. User completes payment -> Transitions PAYMENT_PENDING -> PAYMENT_COMPLETED -> SUBMITTED
    pay_res = client.post("/api/v1/payments/process", headers=user_headers, json={
        "application_id": app_id,
        "payment_method": "DEMO_UPI"
    })
    assert pay_res.status_code == 200
    assert pay_res.json()["workflow_state"] == "SUBMITTED"

    # 5. Admin allocates to LMO and schedules -> SUBMITTED -> LMO_ASSIGNED -> VERIFICATION_SCHEDULED
    sched_dt = datetime.datetime.utcnow() + datetime.timedelta(days=1)
    alloc_res = client.post(
        f"/api/v1/assignments/{app_id}/allocate",
        headers=admin_headers,
        json={
            "assigned_role": "LMO",
            "assigned_user_id": lmo_user.id,
            "scheduled_date": sched_dt.isoformat(),
            "notes": "Field test scheduled"
        }
    )
    assert alloc_res.status_code == 200
    assert alloc_res.json()["current_status"] == "VERIFICATION_SCHEDULED"
    assert alloc_res.json()["assigned_role"] == "LMO"

    # 6. Officer starts verification -> Transitions to UNDER_VERIFICATION
    start_res = client.post("/api/v1/verifications/start", headers=lmo_headers, json={
        "application_id": app_id
    })
    assert start_res.status_code == 200
    ver_data = start_res.json()
    ver_id = ver_data["id"]

    chk_app = client.get(f"/api/v1/applications/{app_id}", headers=user_headers).json()
    assert chk_app["current_status"] == "UNDER_VERIFICATION"

    # 7. Officer submits PASS readings -> UNDER_VERIFICATION -> CERTIFICATE_ISSUED
    sub_res = client.post(f"/api/v1/verifications/{ver_id}/submit", headers=lmo_headers, json={
        "identity_confirmed": True,
        "physical_condition": "Good",
        "seal_condition": "Intact",
        "display_condition": "Clear",
        "remarks": "Calibrated successfully within tolerance",
        "reference_value": 1000.0,
        "observed_value": 1001.0, # +0.10% error, PASS with +/-0.50%
        "verification_lat": 19.076,
        "verification_lng": 72.998,
        "gps_accuracy": 5.0
    })
    assert sub_res.status_code == 200
    sub_data = sub_res.json()
    assert sub_data["result"] == "PASS"
    assert sub_data["certificate_number"] is not None

    # Verify final application status is CERTIFICATE_ISSUED
    final_app = client.get(f"/api/v1/applications/{app_id}", headers=user_headers).json()
    assert final_app["current_status"] == "CERTIFICATE_ISSUED"
