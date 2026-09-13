from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.enums import VerificationResult, LimitType
from app.services.rules_engine import resolve_applicable_rule

def calculate_verification_result(
    reference_value: float,
    observed_value: float,
    applied_rule: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Computes measurement error and evaluates against configured rule.
    error = observed_value - reference_value
    percentage_error = ((observed_value - reference_value) / reference_value) * 100
    """
    if reference_value == 0:
        raise ValueError("Reference value cannot be zero.")

    error = round(observed_value - reference_value, 4)
    percentage_error = round(((observed_value - reference_value) / reference_value) * 100.0, 4)

    limit_value = float(applied_rule["permissible_limit_value"])
    limit_type = applied_rule.get("limit_type", LimitType.PERCENTAGE)

    # Evaluate PASS / FAIL against resolved permissible rule
    if limit_type == LimitType.PERCENTAGE:
        # Example: permissible_limit_value = 0.50 => abs(percentage_error) <= 0.50
        passed = abs(percentage_error) <= (limit_value + 1e-9)
    else:
        # Absolute limit
        passed = abs(error) <= (limit_value + 1e-9)

    result = VerificationResult.PASS if passed else VerificationResult.FAIL

    return {
        "reference_value": reference_value,
        "observed_value": observed_value,
        "error_value": error,
        "percentage_error": percentage_error,
        "applied_rule_id": applied_rule["rule_id"],
        "applied_rule_version": applied_rule["version"],
        "permissible_limit_value": limit_value,
        "limit_type": limit_type,
        "rule_source": applied_rule.get("source", "Configurable Rules Engine"),
        "result": result,
        "disclaimer": applied_rule.get("disclaimer")
    }

def preview_calculation(
    db: Session,
    instrument_type: str,
    accuracy_class: Optional[str],
    test_parameter: str,
    reference_value: float,
    observed_value: float
) -> Dict[str, Any]:
    """
    Resolves rule dynamically and performs preview calculation.
    """
    rule = resolve_applicable_rule(
        db=db,
        instrument_type=instrument_type,
        accuracy_class=accuracy_class,
        test_parameter=test_parameter
    )
    return calculate_verification_result(reference_value, observed_value, rule)
