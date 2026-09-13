import os
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Add backend directory to sys.path
backend_path = str(Path(__file__).resolve().parent.parent / "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.main import app
from app.core.database import SessionLocal
from app.seed import seed_database
from app.core.security import create_access_token
from app.models.models import User
from app.models.enums import RoleEnum

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    seed_database()

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

def get_auth_headers(role: RoleEnum, username: str, user_id: int):
    token = create_access_token(subject=user_id, role=role.value)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def user_headers(db):
    user = db.query(User).filter(User.role == RoleEnum.USER).first()
    return get_auth_headers(RoleEnum.USER, user.username, user.id)

@pytest.fixture
def lmo_headers(db):
    user = db.query(User).filter(User.role == RoleEnum.LMO).first()
    return get_auth_headers(RoleEnum.LMO, user.username, user.id)

@pytest.fixture
def gatc_headers(db):
    user = db.query(User).filter(User.role == RoleEnum.GATC).first()
    return get_auth_headers(RoleEnum.GATC, user.username, user.id)

@pytest.fixture
def admin_headers(db):
    user = db.query(User).filter(User.role == RoleEnum.ADMIN).first()
    return get_auth_headers(RoleEnum.ADMIN, user.username, user.id)
