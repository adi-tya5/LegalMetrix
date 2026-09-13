import datetime
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app.models.models import Rule
from app.models.enums import LimitType

DEMO_DISCLAIMER = (
    "Demonstration Configuration — actual permissible limits must be configured "
    "according to applicable instrument, test conditions, jurisdiction, and current regulatory requirements."
)

DEMO_FALLBACK_RULE = {
    "rule_id": "RULE-DWM-001",
    "instrument_type": "Digital Weighing Machine",
    "accuracy_class": "Demo",
    "test_parameter": "Measurement Error",
    "permissible_limit_value": 0.50, # +/- 0.50%
    "limit_type": LimitType.PERCENTAGE,
    "verification_period_days": 365,
    "source": "Demonstration Configuration",
    "version": "DEMO-1.0",
    "disclaimer": DEMO_DISCLAIMER
}

def resolve_applicable_rule(
    db: Session,
    instrument_type: str,
    accuracy_class: Optional[str] = None,
    test_parameter: str = "Measurement Error"
) -> dict:
    """
    Resolves permissible rule following strict 4-tier hierarchy:
    1. Exact: instrument_type + accuracy_class + test_parameter
    2. Fallback: instrument_type + test_parameter where accuracy_class is NULL / empty
    3. Generic default rule (instrument_type = 'DEFAULT')
    4. Demo fallback configuration
    """
    now = datetime.datetime.utcnow()

    # Base query for active rules
    base_q = db.query(Rule).filter(
        Rule.is_active == True,
        Rule.effective_from <= now,
        (Rule.effective_to == None) | (Rule.effective_to >= now)
    )

    # 1. Exact match
    if accuracy_class:
        rule = base_q.filter(
            Rule.instrument_type == instrument_type,
            Rule.accuracy_class == accuracy_class,
            Rule.test_parameter == test_parameter
        ).order_by(Rule.created_at.desc()).first()
        if rule:
            return _format_rule(rule)

    # 2. Fallback: instrument_type + test_parameter (accuracy_class is NULL or empty)
    rule = base_q.filter(
        Rule.instrument_type == instrument_type,
        (Rule.accuracy_class == None) | (Rule.accuracy_class == ""),
        Rule.test_parameter == test_parameter
    ).order_by(Rule.created_at.desc()).first()
    if rule:
        return _format_rule(rule)

    # 3. Generic default rule
    rule = base_q.filter(
        Rule.instrument_type == "DEFAULT",
        Rule.test_parameter == test_parameter
    ).order_by(Rule.created_at.desc()).first()
    if rule:
        return _format_rule(rule)

    # 4. Built-in demo fallback configuration
    return dict(DEMO_FALLBACK_RULE)

def _format_rule(rule: Rule) -> dict:
    return {
        "rule_id": rule.rule_id,
        "instrument_type": rule.instrument_type,
        "accuracy_class": rule.accuracy_class,
        "test_parameter": rule.test_parameter,
        "permissible_limit_value": rule.permissible_limit_value,
        "limit_type": rule.limit_type,
        "verification_period_days": rule.verification_period_days,
        "source": rule.source,
        "version": rule.version,
        "disclaimer": DEMO_DISCLAIMER
    }
