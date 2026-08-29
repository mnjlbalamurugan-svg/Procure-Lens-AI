import re
from typing import List, Dict, Any, Tuple, Optional

def parse_numeric(value_str: Any) -> float:
    """
    Robust utility to extract a numeric float from a string.
    E.g. "₹60,000" -> 60000.0, "16GB" -> 16.0, "3 years" -> 3.0, "25 days" -> 25.0
    """
    if value_str is None:
        return 0.0
    if isinstance(value_str, (int, float)):
        return float(value_str)
        
    # Convert string to lowercase and remove spaces
    s = str(value_str).lower().replace(",", "").strip()
    
    # Check for unit variations
    # Extract first sequence of numbers (including decimal points)
    match = re.search(r"[-+]?\d*\.\d+|\d+", s)
    if match:
        return float(match.group())
    return 0.0

def evaluate_compliance(required_value: str, extracted_value: Any) -> Tuple[str, str, str]:
    """
    Compares required_value (e.g. ">= 16GB", "<= 30 days", "30-day credit")
    with extracted_value (e.g. "16GB", "45 days").
    
    Returns a tuple of (status, explanation, evidence).
    status: MATCH, PARTIAL, FAIL, UNKNOWN
    """
    if extracted_value is None or str(extracted_value).upper() in ["UNKNOWN", "NOT_SPECIFIED", "N/A"]:
        return (
            "UNKNOWN",
            f"Value for this requirement was not specified in the proposal.",
            "Not specified in proposal."
        )

    req_str = str(required_value).strip()
    ext_str = str(extracted_value).strip()
    
    # Case 1: Numeric comparisons (>=, <=, >, <)
    match_op = re.match(r"^([><]=?)\s*(.*)$", req_str)
    if match_op:
        op = match_op.group(1)
        req_val_str = match_op.group(2)
        
        req_num = parse_numeric(req_val_str)
        ext_num = parse_numeric(ext_str)
        
        if op == ">=":
            success = ext_num >= req_num
        elif op == "<=":
            success = ext_num <= req_num
        elif op == ">":
            success = ext_num > req_num
        elif op == "<":
            success = ext_num < req_num
        else:
            success = False
            
        if success:
            return (
                "MATCH", 
                f"Extracted value '{ext_str}' satisfies requirement '{req_str}' (numeric: {ext_num} vs {req_num}).",
                f"Found value: {ext_str}"
            )
        else:
            return (
                "FAIL", 
                f"Extracted value '{ext_str}' fails to satisfy requirement '{req_str}' (numeric: {ext_num} vs {req_num}).",
                f"Found value: {ext_str}"
            )
            
    # Case 2: String matching
    req_lower = req_str.lower()
    ext_lower = ext_str.lower()
    
    if req_lower == ext_lower or req_lower in ext_lower:
        return (
            "MATCH",
            f"Extracted value '{ext_str}' matches requirement '{req_str}'.",
            f"Found match: {ext_str}"
        )
    
    # Try semantic check for credit/advance terms
    if "credit" in req_lower and "credit" in ext_lower:
        # Check days
        req_days = parse_numeric(req_lower)
        ext_days = parse_numeric(ext_lower)
        if ext_days >= req_days:
            return (
                "MATCH",
                f"Extracted credit terms '{ext_str}' satisfy requirement '{req_str}'.",
                f"Found terms: {ext_str}"
            )
        else:
            return (
                "PARTIAL",
                f"Extracted credit terms '{ext_str}' are shorter than required '{req_str}'.",
                f"Found terms: {ext_str}"
            )
            
    if "advance" in ext_lower:
        # If requirement does not explicitly allow advance payment, but we found it, it's a risk / warning
        return (
            "PARTIAL",
            f"Extracted terms '{ext_str}' include advance payment which deviates from required '{req_str}'.",
            f"Found terms: {ext_str}"
        )
        
    return (
        "FAIL",
        f"Extracted value '{ext_str}' does not match requirement '{req_str}'.",
        f"Found value: {ext_str}"
    )

class ScoringEngine:
    @staticmethod
    def calculate_scores(
        requirements: List[Dict[str, Any]], 
        extracted_fields: Dict[str, Any], 
        weights: Dict[str, float],
        risks: List[Dict[str, Any]],
        project_budget: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Calculates scores for a single vendor proposal deterministically.
        
        weights: Dictionary of:
          - price
          - technical
          - warranty
          - delivery
          - payment
          - risk
        """
        # Normalize weights to total 100%
        total_weight_input = sum(weights.values())
        norm_weights = {}
        if total_weight_input > 0:
            for k, v in weights.items():
                norm_weights[k] = (v / total_weight_input) * 100
        else:
            norm_weights = {
                "price": 30.0, "technical": 30.0, "warranty": 15.0,
                "delivery": 10.0, "payment": 10.0, "risk": 5.0
            }
            
        # Group requirements by category
        # Standardized categories map to weights
        cat_map = {
            "COMMERCIAL": "price",
            "TECHNICAL": "technical",
            "WARRANTY": "warranty",
            "DELIVERY": "delivery",
            "PAYMENT": "payment"
        }
        
        reqs_by_cat = {
            "price": [],
            "technical": [],
            "warranty": [],
            "delivery": [],
            "payment": []
        }
        
        for req in requirements:
            cat = req.get("category", "").upper()
            w_cat = cat_map.get(cat, "technical")
            reqs_by_cat[w_cat].append(req)
            
        compliance_results = []
        category_compliance_scores = {
            "price": 100.0,
            "technical": 100.0,
            "warranty": 100.0,
            "delivery": 100.0,
            "payment": 100.0
        }
        
        has_mandatory_fail = False
        
        # 1. Process standard compliance categories
        for w_cat, cat_reqs in reqs_by_cat.items():
            if not cat_reqs:
                category_compliance_scores[w_cat] = 100.0
                continue
                
            total_req_weight = sum(r.get("weight", 10.0) for r in cat_reqs)
            weighted_score_sum = 0.0
            
            for req in cat_reqs:
                req_param = req.get("parameter", "").lower()
                req_val = req.get("required_value", "")
                is_mandatory = req.get("mandatory", False)
                req_weight = req.get("weight", 10.0)
                
                # Retrieve matching extracted field
                # E.g. parameter "RAM" -> check extracted_fields for "ram" or "technical_specifications"
                extracted_val = None
                
                # Check direct match
                for field_key, field_val in extracted_fields.items():
                    if field_key.lower().replace("_", "") == req_param.replace(" ", ""):
                        extracted_val = field_val
                        break
                        
                # Check in technical_specifications dict
                if extracted_val is None and "technical_specifications" in extracted_fields:
                    tech_specs = extracted_fields["technical_specifications"] or {}
                    for k, v in tech_specs.items():
                        if k.lower().replace("_", "") == req_param.replace(" ", ""):
                            extracted_val = v
                            break
                            
                # Fallbacks for common procurement parameters
                if extracted_val is None:
                    if "price" in req_param or "cost" in req_param:
                        extracted_val = extracted_fields.get("unit_price") or extracted_fields.get("total_price")
                    elif "warranty" in req_param:
                        extracted_val = extracted_fields.get("warranty")
                    elif "delivery" in req_param:
                        extracted_val = extracted_fields.get("delivery_time")
                    elif "payment" in req_param:
                        extracted_val = extracted_fields.get("payment_terms")
                        
                # Evaluate compliance
                status, explanation, evidence = evaluate_compliance(req_val, extracted_val)
                
                compliance_results.append({
                    "requirement_id": req.get("id"),
                    "category": req.get("category"),
                    "parameter": req.get("parameter"),
                    "required_value": req_val,
                    "extracted_value": str(extracted_val) if extracted_val is not None else "UNKNOWN",
                    "status": status,
                    "explanation": explanation,
                    "evidence": evidence
                })
                
                if status == "FAIL" and is_mandatory:
                    has_mandatory_fail = True
                    
                # Compliance values: MATCH=100%, PARTIAL=50%, FAIL/UNKNOWN=0%
                comp_score = 0.0
                if status == "MATCH":
                    comp_score = 100.0
                elif status == "PARTIAL":
                    comp_score = 50.0
                    
                weighted_score_sum += comp_score * req_weight
                
            if total_req_weight > 0:
                category_compliance_scores[w_cat] = weighted_score_sum / total_req_weight
            else:
                category_compliance_scores[w_cat] = 100.0

        # Special logic for Price Score if unit_price is available
        # To score price relative to budget, rather than just boolean compliance.
        extracted_unit_price = parse_numeric(extracted_fields.get("unit_price"))
        if extracted_unit_price > 0 and project_budget is not None:
            # Budget unit price is budget / project quantity
            # If the user did not specify quantity, default to 1
            # E.g. budget = 6000000, quantity = 100 -> budget_unit = 60000
            # If unit price is within budget, we scale it.
            # If unit price is 0, score is 0.
            # If unit price is higher than budget, price score is penalized.
            quantity = parse_numeric(extracted_fields.get("quantity") or 1)
            budget_unit = project_budget
            
            # Find the commercial requirements to see if a custom price constraint is set
            price_reqs = reqs_by_cat["price"]
            if price_reqs:
                # E.g. <= 60000
                req_val_str = price_reqs[0].get("required_value", "")
                match_op = re.search(r"[-+]?\d*\.\d+|\d+", req_val_str)
                if match_op:
                    budget_unit = float(match_op.group())
            
            if extracted_unit_price <= budget_unit:
                # Closer to 0 price is better, scale from 0 to budget_unit
                # Let's say if it's equal to budget_unit, it gets 70 points.
                # If it's less, it gets more points.
                category_compliance_scores["price"] = 70.0 + (30.0 * (1 - (extracted_unit_price / budget_unit)))
            else:
                # Exceeds budget, score degrades quickly
                category_compliance_scores["price"] = max(0.0, 70.0 * (budget_unit / extracted_unit_price) - 20.0)

        # 2. Risk Score calculation
        # Starts at 100, subtract for risk severity
        risk_score = 100.0
        for risk in risks:
            sev = str(risk.get("severity", "")).upper()
            if sev == "HIGH":
                risk_score -= 30.0
            elif sev == "MEDIUM":
                risk_score -= 15.0
            elif sev == "LOW":
                risk_score -= 5.0
        risk_score = max(0.0, risk_score)

        # 3. Calculate weighted total score
        total_score = (
            (category_compliance_scores["price"] * norm_weights.get("price", 30.0)) +
            (category_compliance_scores["technical"] * norm_weights.get("technical", 30.0)) +
            (category_compliance_scores["warranty"] * norm_weights.get("warranty", 15.0)) +
            (category_compliance_scores["delivery"] * norm_weights.get("delivery", 10.0)) +
            (category_compliance_scores["payment"] * norm_weights.get("payment", 10.0)) +
            (risk_score * norm_weights.get("risk", 5.0))
        ) / 100.0
        
        # 4. Mandatory Failure Penalty
        # "FAIL should heavily penalize the vendor"
        # Subtract 40 points (out of 100) or halve the score, capped at 0. Let's subtract 40 points.
        if has_mandatory_fail:
            total_score = max(0.0, total_score - 40.0)

        return {
            "price_score": round(category_compliance_scores["price"], 1),
            "technical_score": round(category_compliance_scores["technical"], 1),
            "warranty_score": round(category_compliance_scores["warranty"], 1),
            "delivery_score": round(category_compliance_scores["delivery"], 1),
            "payment_score": round(category_compliance_scores["payment"], 1),
            "risk_score": round(risk_score, 1),
            "total_score": round(total_score, 1),
            "compliance_results": compliance_results,
            "has_mandatory_fail": has_mandatory_fail
        }
