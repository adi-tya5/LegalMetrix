import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
STORAGE_DIR = BASE_DIR / "storage"
CERTIFICATES_DIR = STORAGE_DIR / "certificates"
QR_DIR = STORAGE_DIR / "qr_codes"
EVIDENCE_DIR = STORAGE_DIR / "evidence"

STORAGE_DIR.mkdir(parents=True, exist_ok=True)
CERTIFICATES_DIR.mkdir(parents=True, exist_ok=True)
QR_DIR.mkdir(parents=True, exist_ok=True)
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)

class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "LegalMetrix")
    PROJECT_TAGLINE: str = os.getenv(
        "PROJECT_TAGLINE", 
        "Unified Digital Verification & Certification Platform for Weighing & Measuring Instruments"
    )
    PROBLEM_STATEMENT: str = "SIH26036"
    CATEGORY: str = "Software"
    VERSION: str = "1.0.0-SIH2026-PROTOTYPE"

    # Disclaimer text strictly enforced across system
    DISCLAIMER_TEXT: str = (
        "Demonstration Configuration — actual permissible limits and fees must be configured "
        "according to applicable instrument, test conditions, jurisdiction, and current regulatory requirements."
    )
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "legalmetrix-sih2026-secret-key-development-mode-only")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    
    # Primary design: PostgreSQL; isolated fallback: SQLite
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./legalmetrix.db")
    
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "https://legalmetrix-sih.vercel.app")
    BACKEND_URL: str = os.getenv("BACKEND_URL", "https://legalmetrix-qjt1.onrender.com")

settings = Settings()
