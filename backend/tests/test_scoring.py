import pytest
from app.utils.scoring_engine import parse_numeric, evaluate_compliance, ScoringEngine

def test_parse_numeric():
    assert parse_numeric("₹60,000") == 60000.0
    assert parse_numeric("16GB") == 16.0
    assert parse_numeric("3 years") == 3.0
    assert parse_numeric("25 days") == 25.0
    assert parse_numeric(58000) == 58000.0
    assert parse_numeric(None) == 0.0
    assert parse_numeric("Unknown") == 0.0

def test_evaluate_compliance():
    # Numeric check >=
    status, _, _ = evaluate_compliance(">= 16GB", "32GB")
    assert status == "MATCH"
    
    status, _, _ = evaluate_compliance(">= 16GB", "8GB")
    assert status == "FAIL"
    
    # Numeric check <=
    status, _, _ = evaluate_compliance("<= 30 days", "20 days")
    assert status == "MATCH"
    
    status, _, _ = evaluate_compliance("<= 30 days", "45 days")
    assert status == "FAIL"

    # String / payment match
    status, _, _ = evaluate_compliance("30-day credit", "30-day credit payment terms")
    assert status == "MATCH"
    
    status, _, _ = evaluate_compliance("30-day credit", "advance payment")
    assert status == "PARTIAL" # advance payment triggers partial compliance mismatch
    
    # Unknown values
    status, _, _ = evaluate_compliance(">= 3 years", "UNKNOWN")
    assert status == "UNKNOWN"

def test_scoring_engine_calculation():
    # Define test requirements
    requirements = [
        {"id": 1, "category": "Commercial", "parameter": "Unit Price", "required_value": "<= ₹60000", "weight": 30.0, "mandatory": True},
        {"id": 2, "category": "Technical", "parameter": "RAM", "required_value": ">= 16GB", "weight": 30.0, "mandatory": True},
        {"id": 3, "category": "Warranty", "parameter": "Warranty", "required_value": ">= 3 years", "weight": 15.0, "mandatory": True},
        {"id": 4, "category": "Delivery", "parameter": "Delivery Time", "required_value": "<= 30 days", "weight": 10.0, "mandatory": True},
        {"id": 5, "category": "Payment", "parameter": "Payment Terms", "required_value": "30-day credit", "weight": 10.0, "mandatory": False}
    ]

    # Test Vendor A (Fully compliant)
    vendor_a_fields = {
        "unit_price": 58000.0,
        "ram": "16GB",
        "warranty": "3 years",
        "delivery_time": "25 days",
        "payment_terms": "30-day credit"
    }
    
    weights = {
        "price": 30.0, "technical": 30.0, "warranty": 15.0,
        "delivery": 10.0, "payment": 10.0, "risk": 5.0
    }
    
    score_a = ScoringEngine.calculate_scores(requirements, vendor_a_fields, weights, [], project_budget=60000.0)
    assert score_a["total_score"] >= 80.0
    assert not score_a["has_mandatory_fail"]

    # Test Vendor C (Fails mandatory RAM, Warranty, Delivery)
    vendor_c_fields = {
        "unit_price": 54000.0,
        "ram": "8GB",
        "warranty": "2 years",
        "delivery_time": "45 days",
        "payment_terms": "30-day credit"
    }
    
    score_c = ScoringEngine.calculate_scores(requirements, vendor_c_fields, weights, [], project_budget=60000.0)
    assert score_c["has_mandatory_fail"]
    # Penalty applies, so total score should be severely reduced
    assert score_c["total_score"] < 50.0
