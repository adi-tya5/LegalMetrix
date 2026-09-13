import datetime
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models.models import (
    User, Instrument, Application, Payment, Assignment,
    Verification, Certificate, Rule, FeeConfiguration,
    Notification, AuditLog
)
from app.models.enums import (
    RoleEnum, WorkflowState, VerificationResult, LimitType,
    ApplicationType, PaymentStatus, EvidenceCategory
)
from app.services.certificate_service import (
    generate_canonical_string, compute_sha256_hash
)
from app.services.qr_service import generate_qr_code_for_certificate
from app.services.pdf_service import generate_pdf_certificate
from app.services.audit_service import create_audit_log

def seed_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    print("Starting LegalMetrix database seed...")

    # Clear existing data for clean idempotent initialization
    db.query(AuditLog).delete()
    db.query(Notification).delete()
    db.query(Certificate).delete()
    db.query(Verification).delete()
    db.query(Assignment).delete()
    db.query(Payment).delete()
    db.query(Application).delete()
    db.query(Instrument).delete()
    db.query(Rule).delete()
    db.query(FeeConfiguration).delete()
    db.query(User).delete()
    db.commit()

    # 1. Create Users
    default_pw = get_password_hash("Password123!")

    owner = User(
        email="owner@legalmetrix.demo",
        username="owner_rajesh",
        hashed_password=default_pw,
        full_name="Rajesh Kumar",
        role=RoleEnum.USER,
        organization="Apex Logistics & Agro Commodities Ltd.",
        phone="+91 98200 12345",
        is_active=True
    )

    lmo = User(
        email="lmo.officer@legalmetrix.demo",
        username="lmo_vijay",
        hashed_password=default_pw,
        full_name="Inspector Vijay Salve",
        role=RoleEnum.LMO,
        organization="Legal Metrology Department - Mumbai Division",
        phone="+91 98200 23456",
        is_active=True
    )

    gatc = User(
        email="gatc.tester@legalmetrix.demo",
        username="gatc_anil",
        hashed_password=default_pw,
        full_name="Anil Verma",
        role=RoleEnum.GATC,
        organization="Precision NABL & GATC Calibration Laboratories",
        phone="+91 98200 34567",
        is_active=True
    )

    admin = User(
        email="admin@legalmetrix.demo",
        username="admin_sunil",
        hashed_password=default_pw,
        full_name="Sunil Deshmukh",
        role=RoleEnum.ADMIN,
        organization="Legal Metrology Administration Directorate",
        phone="+91 98200 45678",
        is_active=True
    )

    db.add_all([owner, lmo, gatc, admin])
    db.commit()
    db.refresh(owner)
    db.refresh(lmo)
    db.refresh(gatc)
    db.refresh(admin)
    print("Users seeded.")

    # 2. Seed Fee Configurations
    fee_configs = [
        FeeConfiguration(
            fee_id="FEE-STD-001",
            category_type="Standard",
            component_name="Standard Verification Fee",
            amount=800.0,
            version="DEMO-1.0",
            source="Demonstration / Indicative Fee Configuration"
        ),
        FeeConfiguration(
            fee_id="FEE-PLT-001",
            category_type="Platform",
            component_name="Platform Scale Verification Fee",
            amount=1200.0,
            version="DEMO-1.0",
            source="Demonstration / Indicative Fee Configuration"
        ),
        FeeConfiguration(
            fee_id="FEE-PRC-001",
            category_type="Precision",
            component_name="Precision Balance Verification Fee",
            amount=1500.0,
            version="DEMO-1.0",
            source="Demonstration / Indicative Fee Configuration"
        ),
        FeeConfiguration(
            fee_id="FEE-HWB-001",
            category_type="Heavy Weighbridge",
            component_name="Heavy Weighbridge Verification Fee",
            amount=2800.0,
            version="DEMO-1.0",
            source="Demonstration / Indicative Fee Configuration"
        ),
    ]
    db.add_all(fee_configs)
    db.commit()
    print("Fee Configurations seeded.")

    # 3. Seed Rules
    rules = [
        Rule(
            rule_id="RULE-DWM-001",
            instrument_type="Digital Weighing Machine",
            accuracy_class="Demo",
            test_parameter="Measurement Error",
            permissible_limit_value=0.50, # +/- 0.50%
            limit_type=LimitType.PERCENTAGE,
            verification_period_days=365,
            source="Demonstration Configuration",
            version="DEMO-1.0"
        ),
        Rule(
            rule_id="RULE-PWM-001",
            instrument_type="Platform Weighing Machine",
            accuracy_class="Class III",
            test_parameter="Measurement Error",
            permissible_limit_value=0.50,
            limit_type=LimitType.PERCENTAGE,
            verification_period_days=365,
            source="Demonstration Configuration",
            version="DEMO-1.0"
        ),
        Rule(
            rule_id="RULE-HWB-001",
            instrument_type="Heavy Weighbridge",
            accuracy_class="Class III",
            test_parameter="Measurement Error",
            permissible_limit_value=0.50,
            limit_type=LimitType.PERCENTAGE,
            verification_period_days=365,
            source="Demonstration Configuration",
            version="DEMO-1.0"
        ),
        Rule(
            rule_id="RULE-PPD-001",
            instrument_type="Petrol Pump Measuring Device",
            accuracy_class="Class 0.5",
            test_parameter="Measurement Error",
            permissible_limit_value=0.30,
            limit_type=LimitType.PERCENTAGE,
            verification_period_days=180,
            source="Demonstration Configuration",
            version="DEMO-1.0"
        ),
        Rule(
            rule_id="RULE-RWS-001",
            instrument_type="Retail Weighing Scale",
            accuracy_class="Class III",
            test_parameter="Measurement Error",
            permissible_limit_value=0.50,
            limit_type=LimitType.PERCENTAGE,
            verification_period_days=365,
            source="Demonstration Configuration",
            version="DEMO-1.0"
        ),
        Rule(
            rule_id="RULE-DEFAULT",
            instrument_type="DEFAULT",
            accuracy_class=None,
            test_parameter="Measurement Error",
            permissible_limit_value=0.50,
            limit_type=LimitType.PERCENTAGE,
            verification_period_days=365,
            source="Demonstration Configuration",
            version="DEMO-1.0"
        ),
    ]
    db.add_all(rules)
    db.commit()
    print("Rules seeded.")

    # 4. Seed Instruments
    inst1 = Instrument(
        instrument_uid="INST-2026-0001",
        owner_id=owner.id,
        instrument_type="Digital Weighing Machine",
        category="Standard",
        manufacturer="Essae-Teraoka Ltd.",
        model_number="DS-215N",
        serial_number="ES-2025-9921",
        max_capacity=30.0,
        unit="kg",
        accuracy_class="Demo",
        location_address="Warehouse 4, Plot 12, APMC Market, Vashi, Navi Mumbai, Maharashtra 400703",
        latitude=19.0760,
        longitude=72.9980
    )

    inst2 = Instrument(
        instrument_uid="INST-2026-0002",
        owner_id=owner.id,
        instrument_type="Platform Weighing Machine",
        category="Platform",
        manufacturer="Mettler Toledo India",
        model_number="PFA261",
        serial_number="MT-IND-4412",
        max_capacity=500.0,
        unit="kg",
        accuracy_class="Class III",
        location_address="Loading Bay B, Apex Logistics Hub, Kalamboli, Navi Mumbai, Maharashtra 410218",
        latitude=19.0238,
        longitude=73.0984
    )

    inst3 = Instrument(
        instrument_uid="INST-2026-0003",
        owner_id=owner.id,
        instrument_type="Heavy Weighbridge",
        category="Heavy Weighbridge",
        manufacturer="Avery India Ltd.",
        model_number="HWB-100T",
        serial_number="AV-2024-0089",
        max_capacity=60000.0,
        unit="kg",
        accuracy_class="Class III",
        location_address="Gate 1 Weighbridge, Apex Freight Terminal, Panvel, Navi Mumbai 410206",
        latitude=18.9894,
        longitude=73.1175
    )

    inst4 = Instrument(
        instrument_uid="INST-2026-0004",
        owner_id=owner.id,
        instrument_type="Petrol Pump Measuring Device",
        category="Precision",
        manufacturer="Tokheim India",
        model_number="Quantium 510",
        serial_number="TK-PPD-7811",
        max_capacity=50.0,
        unit="L",
        accuracy_class="Class 0.5",
        location_address="Fuel Station Dispenser 2, MIDC Industrial Area, Turbhe, Navi Mumbai 400705",
        latitude=19.0543,
        longitude=73.0182
    )

    inst5 = Instrument(
        instrument_uid="INST-2026-0005",
        owner_id=owner.id,
        instrument_type="Retail Weighing Scale",
        category="Standard",
        manufacturer="Eagle Scales",
        model_number="EG-Compact-15",
        serial_number="EG-2026-0144",
        max_capacity=15.0,
        unit="kg",
        accuracy_class="Class III",
        location_address="Retail Counter 3, Wholesale Mart, Sector 19, Vashi, Navi Mumbai 400703",
        latitude=19.0792,
        longitude=72.9991
    )

    db.add_all([inst1, inst2, inst3, inst4, inst5])
    db.commit()
    for i in [inst1, inst2, inst3, inst4, inst5]:
        db.refresh(i)
    print("Instruments seeded.")

    # 5. Seed Applications, Verifications, and Certificates
    now = datetime.datetime.utcnow()

    # --- Instrument 1: VALID Certificate (Issued 30 days ago, valid for 365 days) ---
    app1 = Application(
        application_number="APP-2026-0001",
        instrument_id=inst1.id,
        applicant_id=owner.id,
        application_type=ApplicationType.INITIAL,
        current_status=WorkflowState.CERTIFICATE_ISSUED,
        fee_amount=800.0,
        payment_status=PaymentStatus.COMPLETED,
        assigned_role=RoleEnum.LMO,
        assigned_user_id=lmo.id,
        scheduled_date=now - datetime.timedelta(days=32),
        scheduled_notes="Routine annual verification inspection"
    )
    db.add(app1)
    db.commit()
    db.refresh(app1)

    pay1 = Payment(
        payment_reference="PAY-2026-00001",
        application_id=app1.id,
        amount=800.0,
        status=PaymentStatus.COMPLETED,
        payment_method="DEMO_UPI",
        gateway_response={"status": "SUCCESS"}
    )
    db.add(pay1)

    ver1 = Verification(
        verification_number="VER-2026-00001",
        application_id=app1.id,
        instrument_id=inst1.id,
        verifier_id=lmo.id,
        verifier_role=RoleEnum.LMO,
        verification_date=now - datetime.timedelta(days=30),
        identity_confirmed=True,
        physical_condition="Good",
        seal_condition="Intact",
        display_condition="Clear and Legible",
        remarks="Device tested with standard calibrated weights. Error well within ±0.50% demo limit.",
        reference_value=1000.0,
        observed_value=1001.5,
        error_value=1.5,
        percentage_error=0.15,
        applied_rule_id="RULE-DWM-001",
        applied_rule_version="DEMO-1.0",
        applied_limit=0.50,
        applied_limit_type=LimitType.PERCENTAGE,
        applied_period_days=365,
        result=VerificationResult.PASS,
        verification_lat=19.0762,
        verification_lng=72.9981,
        gps_accuracy=4.5,
        is_submitted=True,
        submitted_at=now - datetime.timedelta(days=30)
    )
    db.add(ver1)
    db.commit()
    db.refresh(ver1)

    cert_no1 = "CERT-MH-001-0001"
    issue_dt1 = now - datetime.timedelta(days=30)
    expiry_dt1 = issue_dt1 + datetime.timedelta(days=365)
    canonical1 = generate_canonical_string(
        certificate_number=cert_no1,
        instrument_uid=inst1.instrument_uid,
        verification_number=ver1.verification_number,
        issue_date=issue_dt1,
        expiry_date=expiry_dt1,
        result="VERIFIED",
        applied_rule_id="RULE-DWM-001",
        applied_rule_version="DEMO-1.0"
    )
    sha1, fp1 = compute_sha256_hash(canonical1)
    qr_path1 = generate_qr_code_for_certificate(cert_no1)

    cert1 = Certificate(
        certificate_number=cert_no1,
        verification_id=ver1.id,
        instrument_id=inst1.id,
        issue_date=issue_dt1,
        expiry_date=expiry_dt1,
        verification_period_days=365,
        verifier_id=lmo.id,
        verifier_role=RoleEnum.LMO,
        canonical_data_string=canonical1,
        sha256_hash=sha1,
        display_fingerprint=fp1,
        qr_code_path=qr_path1
    )
    db.add(cert1)
    db.commit()
    db.refresh(cert1)
    pdf_path1 = generate_pdf_certificate(cert1)
    cert1.pdf_path = pdf_path1
    db.commit()

    # --- Instrument 2: EXPIRING SOON (Issued 353 days ago, expires in 12 days) ---
    app2 = Application(
        application_number="APP-2026-0002",
        instrument_id=inst2.id,
        applicant_id=owner.id,
        application_type=ApplicationType.INITIAL,
        current_status=WorkflowState.CERTIFICATE_ISSUED,
        fee_amount=1200.0,
        payment_status=PaymentStatus.COMPLETED,
        assigned_role=RoleEnum.GATC,
        assigned_user_id=gatc.id,
        scheduled_date=now - datetime.timedelta(days=355)
    )
    db.add(app2)
    db.commit()
    db.refresh(app2)

    ver2 = Verification(
        verification_number="VER-2026-00002",
        application_id=app2.id,
        instrument_id=inst2.id,
        verifier_id=gatc.id,
        verifier_role=RoleEnum.GATC,
        verification_date=now - datetime.timedelta(days=353),
        identity_confirmed=True,
        physical_condition="Good",
        seal_condition="Intact",
        display_condition="Clear",
        remarks="Calibrated by GATC laboratory team.",
        reference_value=500.0,
        observed_value=501.0,
        error_value=1.0,
        percentage_error=0.20,
        applied_rule_id="RULE-PWM-001",
        applied_rule_version="DEMO-1.0",
        applied_limit=0.50,
        applied_limit_type=LimitType.PERCENTAGE,
        applied_period_days=365,
        result=VerificationResult.PASS,
        is_submitted=True,
        submitted_at=now - datetime.timedelta(days=353)
    )
    db.add(ver2)
    db.commit()
    db.refresh(ver2)

    cert_no2 = "CERT-MH-001-0002"
    issue_dt2 = now - datetime.timedelta(days=353)
    expiry_dt2 = issue_dt2 + datetime.timedelta(days=365) # 12 days left
    canonical2 = generate_canonical_string(
        certificate_number=cert_no2,
        instrument_uid=inst2.instrument_uid,
        verification_number=ver2.verification_number,
        issue_date=issue_dt2,
        expiry_date=expiry_dt2,
        result="VERIFIED",
        applied_rule_id="RULE-PWM-001",
        applied_rule_version="DEMO-1.0"
    )
    sha2, fp2 = compute_sha256_hash(canonical2)
    qr_path2 = generate_qr_code_for_certificate(cert_no2)

    cert2 = Certificate(
        certificate_number=cert_no2,
        verification_id=ver2.id,
        instrument_id=inst2.id,
        issue_date=issue_dt2,
        expiry_date=expiry_dt2,
        verification_period_days=365,
        verifier_id=gatc.id,
        verifier_role=RoleEnum.GATC,
        canonical_data_string=canonical2,
        sha256_hash=sha2,
        display_fingerprint=fp2,
        qr_code_path=qr_path2
    )
    db.add(cert2)
    db.commit()
    db.refresh(cert2)
    pdf_path2 = generate_pdf_certificate(cert2)
    cert2.pdf_path = pdf_path2
    db.commit()

    # --- Instrument 3: EXPIRED (Issued 385 days ago, expired 20 days ago) ---
    app3 = Application(
        application_number="APP-2026-0003",
        instrument_id=inst3.id,
        applicant_id=owner.id,
        application_type=ApplicationType.INITIAL,
        current_status=WorkflowState.CERTIFICATE_ISSUED,
        fee_amount=2800.0,
        payment_status=PaymentStatus.COMPLETED,
        assigned_role=RoleEnum.LMO,
        assigned_user_id=lmo.id,
        scheduled_date=now - datetime.timedelta(days=387)
    )
    db.add(app3)
    db.commit()
    db.refresh(app3)

    ver3 = Verification(
        verification_number="VER-2026-00003",
        application_id=app3.id,
        instrument_id=inst3.id,
        verifier_id=lmo.id,
        verifier_role=RoleEnum.LMO,
        verification_date=now - datetime.timedelta(days=385),
        identity_confirmed=True,
        physical_condition="Good",
        seal_condition="Intact",
        display_condition="Clear",
        remarks="Heavy weighbridge test with test truck.",
        reference_value=20000.0,
        observed_value=20030.0,
        error_value=30.0,
        percentage_error=0.15,
        applied_rule_id="RULE-HWB-001",
        applied_rule_version="DEMO-1.0",
        applied_limit=0.50,
        applied_limit_type=LimitType.PERCENTAGE,
        applied_period_days=365,
        result=VerificationResult.PASS,
        is_submitted=True,
        submitted_at=now - datetime.timedelta(days=385)
    )
    db.add(ver3)
    db.commit()
    db.refresh(ver3)

    cert_no3 = "CERT-MH-001-0003"
    issue_dt3 = now - datetime.timedelta(days=385)
    expiry_dt3 = issue_dt3 + datetime.timedelta(days=365) # Expired 20 days ago
    canonical3 = generate_canonical_string(
        certificate_number=cert_no3,
        instrument_uid=inst3.instrument_uid,
        verification_number=ver3.verification_number,
        issue_date=issue_dt3,
        expiry_date=expiry_dt3,
        result="VERIFIED",
        applied_rule_id="RULE-HWB-001",
        applied_rule_version="DEMO-1.0"
    )
    sha3, fp3 = compute_sha256_hash(canonical3)
    qr_path3 = generate_qr_code_for_certificate(cert_no3)

    cert3 = Certificate(
        certificate_number=cert_no3,
        verification_id=ver3.id,
        instrument_id=inst3.id,
        issue_date=issue_dt3,
        expiry_date=expiry_dt3,
        verification_period_days=365,
        verifier_id=lmo.id,
        verifier_role=RoleEnum.LMO,
        canonical_data_string=canonical3,
        sha256_hash=sha3,
        display_fingerprint=fp3,
        qr_code_path=qr_path3
    )
    db.add(cert3)
    db.commit()
    db.refresh(cert3)
    pdf_path3 = generate_pdf_certificate(cert3)
    cert3.pdf_path = pdf_path3
    db.commit()

    # --- Instrument 4: FAILED Verification -> RE_VERIFICATION_REQUIRED (No certificate generated) ---
    app4 = Application(
        application_number="APP-2026-0004",
        instrument_id=inst4.id,
        applicant_id=owner.id,
        application_type=ApplicationType.INITIAL,
        current_status=WorkflowState.RE_VERIFICATION_REQUIRED, # FAILED result
        fee_amount=1500.0,
        payment_status=PaymentStatus.COMPLETED,
        assigned_role=RoleEnum.LMO,
        assigned_user_id=lmo.id,
        scheduled_date=now - datetime.timedelta(days=5)
    )
    db.add(app4)
    db.commit()
    db.refresh(app4)

    ver4 = Verification(
        verification_number="VER-2026-00004",
        application_id=app4.id,
        instrument_id=inst4.id,
        verifier_id=lmo.id,
        verifier_role=RoleEnum.LMO,
        verification_date=now - datetime.timedelta(days=4),
        identity_confirmed=True,
        physical_condition="Seal slightly worn",
        seal_condition="Worn / Needs Resealing",
        display_condition="Functional",
        remarks="Fuel delivery test measured 20L check. Exceeded permissible demo tolerance of ±0.30%.",
        reference_value=1000.0,
        observed_value=1008.0,
        error_value=8.0,
        percentage_error=0.80, # Exceeds limit
        applied_rule_id="RULE-PPD-001",
        applied_rule_version="DEMO-1.0",
        applied_limit=0.30,
        applied_limit_type=LimitType.PERCENTAGE,
        applied_period_days=180,
        result=VerificationResult.FAIL,
        failure_reason="Observed error (+0.80%) exceeds permissible delivery limit of ±0.30%. Fuel nozzle pulse calibrator adrift.",
        corrective_action="Recalibrate pump metering unit, replace security seal wire, and apply for re-verification within 14 days.",
        is_submitted=True,
        submitted_at=now - datetime.timedelta(days=4)
    )
    db.add(ver4)
    db.commit()
    # Note: No Certificate generated for failed verification!

    # --- Instrument 5: Active Scheduled Application for LMO ---
    app5 = Application(
        application_number="APP-2026-0005",
        instrument_id=inst5.id,
        applicant_id=owner.id,
        application_type=ApplicationType.INITIAL,
        current_status=WorkflowState.VERIFICATION_SCHEDULED,
        fee_amount=800.0,
        payment_status=PaymentStatus.COMPLETED,
        assigned_role=RoleEnum.LMO,
        assigned_user_id=lmo.id,
        scheduled_date=now + datetime.timedelta(days=1),
        scheduled_notes="Scheduled field verification docket at Vashi Retail Counter."
    )
    db.add(app5)

    # --- Instrument 6: Active Scheduled Application for GATC ---
    inst6 = Instrument(
        instrument_uid="INST-2026-0006",
        owner_id=owner.id,
        instrument_type="Precision Analytical Balance",
        category="Precision",
        manufacturer="Sartorius India Ltd.",
        model_number="ENTRIS-II",
        serial_number="SAR-2026-8812",
        max_capacity=220.0,
        unit="g",
        accuracy_class="Class I",
        location_address="Quality Assurance Lab, APMC Sector 18, Vashi, Navi Mumbai 400703",
        latitude=19.0765,
        longitude=72.9988
    )
    db.add(inst6)
    db.commit()
    db.refresh(inst6)

    app6 = Application(
        application_number="APP-2026-0006",
        instrument_id=inst6.id,
        applicant_id=owner.id,
        application_type=ApplicationType.INITIAL,
        current_status=WorkflowState.VERIFICATION_SCHEDULED,
        fee_amount=1500.0,
        payment_status=PaymentStatus.COMPLETED,
        assigned_role=RoleEnum.GATC,
        assigned_user_id=gatc.id,
        scheduled_date=now + datetime.timedelta(days=2),
        scheduled_notes="GATC Laboratory Calibration Testing Docket."
    )
    db.add(app6)
    db.commit()

    # 6. Generate Dynamic Validity & Expiry Notifications
    from app.services.notification_service import evaluate_and_generate_notifications
    evaluate_and_generate_notifications(db)

    # 7. Initial Immutable Audit Trail
    create_audit_log(
        db=db,
        actor_id=admin.id,
        actor_name=admin.full_name,
        actor_role="ADMIN",
        event_type="SYSTEM_INITIALIZED",
        entity_name="Platform",
        entity_id="LEGALMETRIX-2026",
        metadata_json={"seeder": "seed_database", "mode": "PROTOTYPE"}
    )
    create_audit_log(
        db=db,
        actor_id=lmo.id,
        actor_name=lmo.full_name,
        actor_role="LMO",
        event_type="PASS_CERTIFICATE_GENERATED",
        entity_name="Certificate",
        entity_id="CERT-MH-001-0001",
        metadata_json={"fingerprint": fp1, "sha256_hash": sha1}
    )
    create_audit_log(
        db=db,
        actor_id=lmo.id,
        actor_name=lmo.full_name,
        actor_role="LMO",
        event_type="FAIL_REVERIFICATION_REQUIRED",
        entity_name="Verification",
        entity_id=ver4.verification_number,
        metadata_json={"reason": ver4.failure_reason}
    )

    db.close()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed_database()
