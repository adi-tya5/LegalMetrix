import os
from pathlib import Path
import qrcode
from app.core.config import settings, QR_DIR

def generate_qr_code_for_certificate(certificate_number: str) -> str:
    """
    Generates a QR code linking to the privacy-safe public verification URL:
    {FRONTEND_URL}/verify/{certificate_number}
    """
    verify_url = f"{settings.FRONTEND_URL}/verify/{certificate_number}"
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=3,
    )
    qr.add_data(verify_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#0F2537", back_color="white")
    
    filename = f"qr_{certificate_number.replace('-', '_')}.png"
    file_path = QR_DIR / filename
    img.save(str(file_path))

    return str(file_path)
