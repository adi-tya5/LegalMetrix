import os
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from app.core.config import settings, CERTIFICATES_DIR
from app.models.models import Certificate

def generate_pdf_certificate(certificate: Certificate) -> str:
    """
    Generates a high-quality, professional Legal Metrology verification certificate PDF.
    Includes SHA-256 fingerprint, QR code, applied rule details, and statutory prototype disclaimers.
    """
    filename = f"certificate_{certificate.certificate_number.replace('-', '_')}.pdf"
    pdf_path = CERTIFICATES_DIR / filename

    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0F2537'), # Navy Blue
        alignment=1 # Center
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#007A64'), # Legal Metrology Teal
        alignment=1
    )

    badge_style = ParagraphStyle(
        'DocBadge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#1E7E34'), # Verified Green
        alignment=1
    )

    disclaimer_style = ParagraphStyle(
        'DocDisclaimer',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#666666'),
        alignment=1
    )

    meta_label_style = ParagraphStyle(
        'MetaLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#1E293B')
    )

    meta_val_style = ParagraphStyle(
        'MetaVal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#334155')
    )

    story = []

    # Header
    story.append(Paragraph("LEGALMETRIX", title_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph("DIGITAL VERIFICATION &amp; CALIBRATION CERTIFICATE", subtitle_style))
    story.append(Spacer(1, 2))
    story.append(Paragraph("Smart India Hackathon 2026 Prototype (SIH26036)", disclaimer_style))
    story.append(Spacer(1, 12))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#0F2537'), spaceAfter=15))

    # Certificate ID & Status Badge
    story.append(Paragraph(f"CERTIFICATE NO: <b>{certificate.certificate_number}</b>", title_style))
    story.append(Spacer(1, 6))
    story.append(Paragraph("● STATUS: VERIFIED &amp; CERTIFIED ●", badge_style))
    story.append(Spacer(1, 15))

    # Instrument & Verification Details Table
    inst = certificate.instrument
    ver = certificate.verification
    owner_name = inst.owner.full_name if (inst and inst.owner) else "Authorized Enterprise"
    verifier_name = certificate.verifier.full_name if certificate.verifier else "Designated Officer"

    data = [
        [
            Paragraph("Instrument ID:", meta_label_style),
            Paragraph(inst.instrument_uid if inst else "N/A", meta_val_style),
            Paragraph("Instrument Type:", meta_label_style),
            Paragraph(inst.instrument_type if inst else "N/A", meta_val_style)
        ],
        [
            Paragraph("Manufacturer:", meta_label_style),
            Paragraph(inst.manufacturer if inst else "N/A", meta_val_style),
            Paragraph("Model / Serial:", meta_label_style),
            Paragraph(f"{inst.model_number} / {inst.serial_number}" if inst else "N/A", meta_val_style)
        ],
        [
            Paragraph("Max Capacity:", meta_label_style),
            Paragraph(f"{inst.max_capacity} {inst.unit}" if inst else "N/A", meta_val_style),
            Paragraph("Accuracy Class:", meta_label_style),
            Paragraph(inst.accuracy_class or "Demo", meta_val_style)
        ],
        [
            Paragraph("Instrument Owner:", meta_label_style),
            Paragraph(owner_name, meta_val_style),
            Paragraph("Installation Location:", meta_label_style),
            Paragraph(inst.location_address if inst else "N/A", meta_val_style)
        ],
        [
            Paragraph("Date of Verification:", meta_label_style),
            Paragraph(certificate.issue_date.strftime("%d-%b-%Y"), meta_val_style),
            Paragraph("Certificate Expiry:", meta_label_style),
            Paragraph(certificate.expiry_date.strftime("%d-%b-%Y"), meta_val_style)
        ],
        [
            Paragraph("Verifying Authority:", meta_label_style),
            Paragraph(f"{certificate.verifier_role.value} ({verifier_name})", meta_val_style),
            Paragraph("Validity Period:", meta_label_style),
            Paragraph(f"{certificate.verification_period_days} Days", meta_val_style)
        ],
        [
            Paragraph("Applied Rule:", meta_label_style),
            Paragraph(f"{ver.applied_rule_id or 'RULE-DWM-001'} (v{ver.applied_rule_version or 'DEMO-1.0'})", meta_val_style),
            Paragraph("Permissible Limit:", meta_label_style),
            Paragraph(f"±{ver.applied_limit or 0.50}%", meta_val_style)
        ],
        [
            Paragraph("Calculated Error:", meta_label_style),
            Paragraph(f"{ver.percentage_error or 0.0:+.2f}% (Obs: {ver.observed_value}, Ref: {ver.reference_value})", meta_val_style),
            Paragraph("Verification Result:", meta_label_style),
            Paragraph("PASS (Within Permissible Tolerance)", meta_val_style)
        ]
    ]

    t = Table(data, colWidths=[120, 140, 120, 150])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t)
    story.append(Spacer(1, 15))

    # SHA-256 Integrity Section & QR Code
    qr_img = None
    if certificate.qr_code_path and os.path.exists(certificate.qr_code_path):
        qr_img = Image(certificate.qr_code_path, width=80, height=80)

    integrity_text = (
        f"<b>CRYPTOGRAPHIC INTEGRITY FINGERPRINT:</b><br/>"
        f"<font color='#007A64'><b>{certificate.display_fingerprint}</b></font><br/><br/>"
        f"<b>SHA-256 Hash Digest:</b><br/>"
        f"<font size='7' color='#475569'>{certificate.sha256_hash}</font><br/><br/>"
        f"<i>Scan the QR code to verify live certificate validity and cryptographic integrity "
        f"on the public LegalMetrix portal.</i>"
    )
    integrity_paragraph = Paragraph(integrity_text, meta_val_style)

    security_data = [
        [integrity_paragraph, qr_img if qr_img else ""]
    ]
    sec_table = Table(security_data, colWidths=[430, 100])
    sec_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#007A64')),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F0FDF4')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(sec_table)
    story.append(Spacer(1, 15))

    # Mandatory Legal Metrix Non-Statutory Disclaimer
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=8))
    disclaimer_body = (
        "<b>SYSTEM NOTICE &amp; DISCLAIMER:</b><br/>"
        "This certificate is generated by the LegalMetrix prototype for demonstration purposes under "
        "Smart India Hackathon 2026 Problem Statement SIH26036. "
        "This platform does not claim official statutory government deployment or official government API integration. "
        "Regulatory values and permissible limits are dynamically configured and may vary by instrument, accuracy class, "
        "and applicable jurisdiction."
    )
    story.append(Paragraph(disclaimer_body, disclaimer_style))

    doc.build(story)
    return str(pdf_path)
