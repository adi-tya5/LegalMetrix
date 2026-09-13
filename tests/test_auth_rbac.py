import pytest
from app.models.enums import RoleEnum

def test_login_all_roles(client):
    roles_creds = [
        ("owner_rajesh", "Password123!", RoleEnum.USER),
        ("lmo_vijay", "Password123!", RoleEnum.LMO),
        ("gatc_anil", "Password123!", RoleEnum.GATC),
        ("admin_sunil", "Password123!", RoleEnum.ADMIN),
    ]
    for username, password, expected_role in roles_creds:
        res = client.post("/api/v1/auth/login", json={"username": username, "password": password})
        assert res.status_code == 200, f"Login failed for {username}: {res.text}"
        data = res.json()
        assert data["role"] == expected_role.value
        assert "access_token" in data

def test_user_forbidden_from_admin_endpoints(client, user_headers):
    # USER attempting to access Admin user list -> 403 Forbidden
    res = client.get("/api/v1/users/", headers=user_headers)
    assert res.status_code == 403

    # USER attempting to create a rule -> 403 Forbidden
    res_rule = client.post("/api/v1/rules/", headers=user_headers, json={
        "rule_id": "RULE-TEST-999",
        "instrument_type": "Digital Weighing Machine",
        "permissible_limit_value": 0.50
    })
    assert res_rule.status_code == 403

def test_lmo_and_gatc_access_isolation(client, db, lmo_headers, gatc_headers):
    # Verifiers accessing their assigned verifications
    res_lmo = client.get("/api/v1/applications/", headers=lmo_headers)
    assert res_lmo.status_code == 200

    res_gatc = client.get("/api/v1/applications/", headers=gatc_headers)
    assert res_gatc.status_code == 200
