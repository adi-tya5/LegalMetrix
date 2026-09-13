from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine
import app.models # Ensure all models are registered with Base

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "Unified Digital Verification & Certification Platform for Weighing & Measuring Instruments. "
        "SIH26036 Prototype. All rules and fees are configurable demonstration configurations."
    ),
    version=settings.VERSION
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For SIH prototype demo ease
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Public router directly at root for /verify/{certificate_id}
from app.api.public import router as public_router
app.include_router(public_router)

# Include API v1 routers under /api/v1 and also /api for convenience
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.instruments import router as instruments_router
from app.api.v1.applications import router as applications_router
from app.api.v1.payments import router as payments_router
from app.api.v1.assignments import router as assignments_router
from app.api.v1.verifications import router as verifications_router
from app.api.v1.evidence import router as evidence_router
from app.api.v1.rules import router as rules_router
from app.api.v1.fees import router as fees_router
from app.api.v1.certificates import router as certificates_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.audit import router as audit_router
from app.api.v1.reverification import router as reverification_router
from app.api.v1.reports import router as reports_router

for prefix in ["/api/v1", "/api"]:
    app.include_router(auth_router, prefix=prefix)
    app.include_router(users_router, prefix=prefix)
    app.include_router(instruments_router, prefix=prefix)
    app.include_router(applications_router, prefix=prefix)
    app.include_router(payments_router, prefix=prefix)
    app.include_router(assignments_router, prefix=prefix)
    app.include_router(verifications_router, prefix=prefix)
    app.include_router(evidence_router, prefix=prefix)
    app.include_router(rules_router, prefix=prefix)
    app.include_router(fees_router, prefix=prefix)
    app.include_router(certificates_router, prefix=prefix)
    app.include_router(notifications_router, prefix=prefix)
    app.include_router(audit_router, prefix=prefix)
    app.include_router(reverification_router, prefix=prefix)
    app.include_router(reports_router, prefix=prefix)

@app.get("/")
def root():
    return {
        "platform": settings.PROJECT_NAME,
        "tagline": settings.PROJECT_TAGLINE,
        "problem_statement": settings.PROBLEM_STATEMENT,
        "disclaimer": settings.DISCLAIMER_TEXT,
        "version": settings.VERSION,
        "status": "OPERATIONAL"
    }
