from typing import Dict, Any
from sqlalchemy.orm import Session
from app.models.models import FeeConfiguration, Instrument

DEMO_FEE_DISCLAIMER = "Demonstration / Indicative Fee Configuration — Not an official statutory fee."

DEMO_FALLBACK_FEES = {
    "Standard": 800.0,
    "Platform": 1200.0,
    "Precision": 1500.0,
    "Heavy Weighbridge": 2800.0,
}
DEFAULT_FEE = 1000.0

def calculate_authoritative_fee(db: Session, instrument: Instrument) -> Dict[str, Any]:
    """
    Computes authoritative verification fee from active configuration.
    Client-side fee amounts are NEVER trusted by the backend.
    """
    category = instrument.category or "Standard"
    
    fee_cfg = db.query(FeeConfiguration).filter(
        FeeConfiguration.is_active == True,
        FeeConfiguration.category_type == category
    ).order_by(FeeConfiguration.created_at.desc()).first()

    if fee_cfg:
        return {
            "instrument_category": category,
            "component_name": fee_cfg.component_name,
            "authoritative_amount": float(fee_cfg.amount),
            "version": fee_cfg.version,
            "source_disclaimer": DEMO_FEE_DISCLAIMER
        }

    # Fallback to configured defaults
    amount = DEMO_FALLBACK_FEES.get(category, DEFAULT_FEE)
    return {
        "instrument_category": category,
        "component_name": f"{category} Verification Fee (Indicative)",
        "authoritative_amount": float(amount),
        "version": "DEMO-1.0",
        "source_disclaimer": DEMO_FEE_DISCLAIMER
    }
