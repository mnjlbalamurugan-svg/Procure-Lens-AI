import os
import json
import re
from typing import List, Dict, Any, Tuple
import google.generativeai as genai
from ..schemas import StructuredProposalData
from ..utils.scoring_engine import parse_numeric

# Initialize Gemini SDK
api_key = os.getenv("GEMINI_API_KEY")
DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"

if api_key:
    genai.configure(api_key=api_key)

class AIService:
    @staticmethod
    def _is_demo_active() -> bool:
        return DEMO_MODE or not api_key

    @staticmethod
    def analyze_proposal(extracted_text: str, vendor_name: str) -> StructuredProposalData:
        """
        Parses raw proposal text and returns structured vendor proposal information.
        If in Demo Mode, returns pre-baked details for Vendor A, B, or C if recognized,
        or performs a fallback regex parse for new text.
        """
        vendor_clean = vendor_name.upper().strip()
        text_clean = extracted_text.upper()
        
        # Check if the text matches the seeded Laptop Procurement demo documents
        is_demo_doc = (
            ("VENDOR A" in vendor_clean and "SERIES A" in text_clean) or
            ("VENDOR B" in vendor_clean and "PREMIUM OFFICE" in text_clean) or
            ("VENDOR C" in vendor_clean and "VALUE BOOK" in text_clean)
        )

        # 1. Return pre-baked stubs if DEMO_MODE is true AND the document is a recognized demo doc
        if AIService._is_demo_active() and is_demo_doc:
            if "VENDOR A" in vendor_clean:
                return StructuredProposalData(
                    vendor_name="Vendor A",
                    product_or_service="Standard Enterprise Laptops",
                    unit_price=58000.0,
                    total_price=5800000.0,
                    currency="INR",
                    quantity=100,
                    discount="N/A",
                    taxes="Inclusive",
                    technical_specifications={
                        "RAM": "16GB DDR4",
                        "Processor": "Intel Core i5 12th Gen",
                        "Storage": "512GB SSD",
                        "Display": "14-inch FHD"
                    },
                    warranty="3 years standard manufacturer warranty",
                    delivery_time="25 days after order confirmation",
                    payment_terms="30-day credit payment terms",
                    contract_terms=["Standard indemnity", "Governed by local jurisdiction"],
                    included_items=["Carry case", "Wired mouse", "Power adapter"],
                    excluded_items=["Extended accidental damage coverage"],
                    additional_charges=[],
                    missing_information=[],
                    confidence_notes=["All commercial parameters extracted with 1.0 confidence."]
                )
            elif "VENDOR B" in vendor_clean:
                return StructuredProposalData(
                    vendor_name="Vendor B",
                    product_or_service="High-Performance Laptops",
                    unit_price=61000.0,
                    total_price=6100000.0,
                    currency="INR",
                    quantity=100,
                    discount="Volume discount applied in unit price",
                    taxes="18% GST extra",
                    technical_specifications={
                        "RAM": "32GB DDR5",
                        "Processor": "Intel Core i7 13th Gen",
                        "Storage": "1TB SSD",
                        "Display": "15.6-inch IPS"
                    },
                    warranty="5 years comprehensive onsite warranty",
                    delivery_time="20 days standard delivery time",
                    payment_terms="50% advance payment required upon purchase order",
                    contract_terms=["SLA guaranteed replacement", "Confidentiality clause"],
                    included_items=["Premium sleeve", "Wireless mouse", "USB-C Hub"],
                    excluded_items=[],
                    additional_charges=["Shipping fee: ₹15,000 extra"],
                    missing_information=["Missing explicit details on software licenses"],
                    confidence_notes=["Payment terms require 50% advance, flagged with medium confidence."]
                )
            elif "VENDOR C" in vendor_clean:
                return StructuredProposalData(
                    vendor_name="Vendor C",
                    product_or_service="Budget Office Laptops",
                    unit_price=54000.0,
                    total_price=5400000.0,
                    currency="INR",
                    quantity=100,
                    discount="10% discount included",
                    taxes="Inclusive of all taxes",
                    technical_specifications={
                        "RAM": "8GB DDR4",
                        "Processor": "Intel Core i3 11th Gen",
                        "Storage": "256GB SSD",
                        "Display": "14-inch HD"
                    },
                    warranty="2 years warranty",
                    delivery_time="45 days delivery timeline",
                    payment_terms="30-day credit payment terms",
                    contract_terms=["Limitation of liability up to contract value"],
                    included_items=["Basic sleeve", "Charger"],
                    excluded_items=["Operating system license (requires separate purchase)"],
                    additional_charges=[],
                    missing_information=["Operating System details not specified", "Unclear RAM upgrade options"],
                    confidence_notes=["Extracted RAM value is below 16GB standard. Confidence is high."]
                )
        
        # If not demo doc or API key is set, attempt live extraction via LLM if key is available
        if api_key:
            # We bypass the demo active check to trigger the real LLM call for custom files
            pass
        else:
            # If no API key is available, run fallback regex parsing
            return AIService._regex_fallback_extraction(extracted_text, vendor_name)

        # 2. Real AI Pipeline via Google Gemini
        prompt = f"""
        You are an expert procurement AI agent. Analyze the following vendor proposal text and extract structured information.
        Return your response in JSON format matching the schema below:
        
        {{
            "vendor_name": "Name of the vendor",
            "product_or_service": "Brief description of products/services offered",
            "unit_price": 50000.0, // float or null if not found
            "total_price": 5000000.0, // float or null if not found
            "currency": "INR", // or USD, etc.
            "quantity": 100, // integer or null if not found
            "discount": "Description of discounts, or 'NOT_SPECIFIED'",
            "taxes": "Description of taxes, or 'NOT_SPECIFIED'",
            "technical_specifications": {{
                "RAM": "e.g. 16GB",
                "Processor": "e.g. Intel i5",
                "Storage": "e.g. 512GB SSD"
                // Extract any other relevant technical fields
            }},
            "warranty": "Warranty description, or 'NOT_SPECIFIED'",
            "delivery_time": "Delivery timeline description, or 'NOT_SPECIFIED'",
            "payment_terms": "Payment terms description, or 'NOT_SPECIFIED'",
            "contract_terms": ["list of key clauses or contract terms"],
            "included_items": ["list of accessories, software, or items included"],
            "excluded_items": ["list of items explicitly excluded"],
            "additional_charges": ["list of extra shipping, installation fees, etc."],
            "missing_information": ["list of critical missing parameters or specifications"],
            "confidence_notes": ["any annotations about extraction confidence or ambiguity"]
        }}

        Guidelines:
        - NEVER invent or assume any values. If a field is not explicitly mentioned in the proposal text, write 'NOT_SPECIFIED' or use null for numbers.
        - Check terms carefully (e.g. warranty length, payment milestones).
        
        Proposal text:
        {extracted_text}
        """

        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            data = json.loads(response.text)
            return StructuredProposalData(**data)
        except Exception as e:
            # Simple retry with a slightly modified request or fallback to regex
            print(f"Gemini API error during proposal extraction: {e}. Attempting fallback.")
            return AIService._regex_fallback_extraction(extracted_text, vendor_name)

    @staticmethod
    def _regex_fallback_extraction(text: str, vendor_name: str) -> StructuredProposalData:
        """
        Regex-based parsing fallback to handle basic extractions when Gemini is down or in demo mode.
        """
        text_lower = text.lower()
        
        # Simple extraction heuristics
        unit_price = None
        price_match = re.search(r"(?:price|rate|unit price|cost|₹|\$)\s*[:=]?\s*(?:rs\.?|₹|\$)?\s*([0-9,]+)", text_lower)
        if price_match:
            try:
                unit_price = float(price_match.group(1).replace(",", ""))
            except ValueError:
                pass
                
        qty = None
        qty_match = re.search(r"(?:qty|quantity|units|pcs)\s*[:=]?\s*([0-9,]+)", text_lower)
        if qty_match:
            try:
                qty = int(qty_match.group(1).replace(",", ""))
            except ValueError:
                pass
                
        delivery = "NOT_SPECIFIED"
        del_match = re.search(r"(?:delivery|dispatch|shipping|shipment|lead time|timeline)\s*(?:schedule|in|within|takes|timeline|is)?\s*[:=]?\s*(\d+\s*(?:days|weeks|months|working days))", text_lower)
        if del_match:
            delivery = del_match.group(1)
        else:
            del_match_alt = re.search(r"(\d+\s*(?:days|weeks|months|working days))\s*(?:\w+\s*){0,3}(?:delivery|dispatch|shipping|lead time|timeline)", text_lower)
            if del_match_alt:
                delivery = del_match_alt.group(1)
            
        warranty = "NOT_SPECIFIED"
        war_match = re.search(r"(?:warranty|guarantee)\s*(?:period|of|is)?\s*[:=]?\s*(\d+\s*(?:years|months|year|month))", text_lower)
        if war_match:
            warranty = war_match.group(1)
        else:
            war_match_alt = re.search(r"(\d+\s*(?:years|months|year|month))\s*(?:\w+\s*){0,3}(?:warranty|guarantee|support)", text_lower)
            if war_match_alt:
                warranty = war_match_alt.group(1)
            
        payment = "NOT_SPECIFIED"
        lines = text.split("\n")
        for i, line in enumerate(lines):
            line_lower = line.lower()
            if "payment" in line_lower or "credit" in line_lower:
                cleaned = line.strip()
                if (len(cleaned) <= 18 or cleaned.endswith(":")) and i + 1 < len(lines):
                    next_line = lines[i+1].strip()
                    if next_line:
                        cleaned = next_line
                
                cleaned = cleaned.replace("-", "").replace("*", "").strip()
                cleaned = re.sub(r"^(?:payment|credit|terms)\s*(?:terms|within|schedule)?\s*[:=-]?\s*", "", cleaned, flags=re.IGNORECASE)
                if cleaned:
                    payment = cleaned.strip()
                    break

        # Build basic tech specs dictionary
        tech_specs = {}
        ram_match = re.search(r"(\d+\s*gb)(?:\s+\w+){0,3}\s+(?:ram|memory)", text_lower)
        if ram_match:
            tech_specs["RAM"] = ram_match.group(1).upper()
        else:
            ram_match_alt = re.search(r"(?:ram|memory|specifications)\s*[:=]?\s*(\d+\s*gb)", text_lower)
            if ram_match_alt:
                tech_specs["RAM"] = ram_match_alt.group(1).upper()

        ssd_match = re.search(r"(\d+\s*(?:gb|tb))\s*(?:ssd|hdd|storage)", text_lower)
        if ssd_match:
            tech_specs["Storage"] = ssd_match.group(1).upper()

        return StructuredProposalData(
            vendor_name=vendor_name,
            product_or_service="Procured Service / Equipment",
            unit_price=unit_price,
            total_price=(unit_price * qty) if (unit_price and qty) else unit_price,
            currency="INR" if "₹" in text or "rs" in text_lower else "USD",
            quantity=qty or 1,
            discount="NOT_SPECIFIED",
            taxes="NOT_SPECIFIED",
            technical_specifications=tech_specs,
            warranty=warranty,
            delivery_time=delivery,
            payment_terms=payment,
            contract_terms=[],
            included_items=[],
            excluded_items=[],
            additional_charges=[],
            missing_information=[],
            confidence_notes=["Extracted using regex parsing engines (fallback mode). Please verify parameters."]
        )

    @staticmethod
    def identify_risks(extracted_data: Dict[str, Any], vendor_name: str) -> List[Dict[str, Any]]:
        """
        Uses AI (or pre-baked stubs for Demo Mode) to identify specific risks and matching evidence.
        """
        vendor_clean = vendor_name.upper().strip()
        
        if AIService._is_demo_active():
            if "VENDOR A" in vendor_clean:
                return [
                    {
                        "type": "Delivery",
                        "severity": "LOW",
                        "description": "Delivery timeline (25 days) is close to the 30-day requirement threshold, which could result in a project delay if any logistics issues arise.",
                        "evidence": "25 days after order confirmation",
                        "recommendation": "Request a guaranteed delivery penalty clause in the SLA to ensure timeline compliance."
                    }
                ]
            elif "VENDOR B" in vendor_clean:
                return [
                    {
                        "type": "Payment",
                        "severity": "HIGH",
                        "description": "Vendor requires a 50% advance payment, which poses a cash flow and delivery risk. This deviates from standard corporate credit terms.",
                        "evidence": "50% advance payment required upon purchase order",
                        "recommendation": "Negotiate a milestone-based payment structure (e.g. 10% advance, 40% on delivery, 50% net 30)."
                    },
                    {
                        "type": "Commercial",
                        "severity": "LOW",
                        "description": "Additional charges are listed for shipping (₹15,000) which increases the effective price beyond the unit budget.",
                        "evidence": "Shipping fee: ₹15,000 extra",
                        "recommendation": "Request the vendor to waive shipping fees or include them inside the bulk price."
                    }
                ]
            elif "VENDOR C" in vendor_clean:
                return [
                    {
                        "type": "Technical",
                        "severity": "HIGH",
                        "description": "RAM specification (8GB) fails the mandatory requirement of >= 16GB. This will impact performance.",
                        "evidence": "RAM: 8GB DDR4",
                        "recommendation": "Disqualify proposal or request a revised proposal with 16GB RAM upgraded."
                    },
                    {
                        "type": "Warranty",
                        "severity": "MEDIUM",
                        "description": "Warranty duration is only 2 years, falling below the mandatory requirement of 3 years.",
                        "evidence": "2 years warranty",
                        "recommendation": "Negotiate a warranty extension to 3 years or cost out an external warranty extension."
                    },
                    {
                        "type": "Delivery",
                        "severity": "MEDIUM",
                        "description": "Delivery timeline of 45 days exceeds the mandatory threshold of 30 days.",
                        "evidence": "45 days delivery timeline",
                        "recommendation": "Negotiate a faster shipping method or request vendor to guarantee delivery in 30 days."
                    }
                ]
            else:
                # Basic default fallback risks for arbitrary data
                risks = []
                # Check price
                if parse_numeric(extracted_data.get("unit_price")) > 60000:
                    risks.append({
                        "type": "Commercial",
                        "severity": "MEDIUM",
                        "description": "Unit price exceeds the budget boundary.",
                        "evidence": f"Unit Price: {extracted_data.get('unit_price')}",
                        "recommendation": "Negotiate a discount or volume pricing."
                    })
                # Check payment
                pay_terms = str(extracted_data.get("payment_terms", "")).lower()
                if "advance" in pay_terms:
                    risks.append({
                        "type": "Payment",
                        "severity": "HIGH",
                        "description": "Advance payment requested, creating a capital risk.",
                        "evidence": extracted_data.get("payment_terms"),
                        "recommendation": "Negotiate credit terms or milestone payments."
                    })
                return risks

        # Real AI Pipeline for identifying risks
        prompt = f"""
        You are a procurement compliance risk auditor. Inspect the following structured vendor data and identify risks.
        Look for payment terms risks (like advance payments), warranty gaps, delivery times, technical specs gaps, and hidden charges.
        
        Return your response in JSON format as a list of risks, like this:
        [
            {{
                "type": "Payment", // Commercial, Technical, Delivery, Warranty, Payment, Contract, General
                "severity": "HIGH", // HIGH, MEDIUM, LOW
                "description": "Detailed explanation of the risk",
                "evidence": "Exact quote or line from the proposal text showing this risk",
                "recommendation": "Actionable procurement recommendation to mitigate the risk"
            }}
        ]

        Only include items that are genuine risks or deviations.
        
        Vendor Data:
        {json.dumps(extracted_data, indent=2)}
        """
        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            return json.loads(response.text)
        except Exception as e:
            print(f"Gemini API error during risk analysis: {e}")
            return []

    @staticmethod
    def generate_recommendation_summary(
        project_name: str,
        budget: float,
        vendors_summary: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Uses AI (or stubs for Demo Mode) to generate the explainable recommendation summary.
        Accepts calculated scores and compliance results.
        """
        # Grounding: Sort vendors to identify the best, second best, etc.
        sorted_vendors = sorted(vendors_summary, key=lambda x: x["total_score"], reverse=True)
        if not sorted_vendors:
            return {
                "summary": "No vendors available to recommend.",
                "strengths": [],
                "concerns": [],
                "recommended_actions": []
            }
            
        best_vendor = sorted_vendors[0]
        runner_up = sorted_vendors[1] if len(sorted_vendors) > 1 else None
        
        # 1. Demo Mode laptop procurement fallback
        if AIService._is_demo_active() and "Laptop" in project_name:
            # Vendor B score is 91, Vendor A is 84, Vendor C is 74 (or similar depending on weights)
            # Check who is actually evaluated as best vendor in our python sorted list
            rec_name = best_vendor["name"]
            if rec_name == "Vendor B":
                return {
                    "summary": "Vendor B is highly recommended due to exceptional technical performance (32GB RAM DDR5 vs 16GB on A, 8GB on C) and a superior comprehensive 5-year warranty. Although the base unit price (₹61,000) slightly exceeds the initial budget of ₹60,000, the massive technical upgrade and long-term warranty provide the highest overall value and lowest risk of future technical obsolescence.",
                    "strengths": [
                        "Outstanding 32GB RAM DDR5 offering double the memory of other candidates",
                        "Industry-leading 5-year onsite comprehensive warranty minimizing maintenance costs",
                        "Fastest delivery time of 20 days"
                    ],
                    "concerns": [
                        "Unit price (₹61,000) exceeds budget threshold by ₹1,000",
                        "Requires 50% advance payment, which deviates from standard credit terms"
                    ],
                    "recommended_actions": [
                        "Negotiate the 50% advance down to 20% advance with 80% paid on delivery.",
                        "Request a waiver of the ₹15,000 shipping charges.",
                        "Confirm if OS license is included in the premium specification."
                    ]
                }
            elif rec_name == "Vendor A":
                return {
                    "summary": "Vendor A is recommended because it is fully compliant with all mandatory requirements, offers standard credit payment terms (30-day credit), and is within budget (₹58,000). While Vendor B offers better technical specs and warranty, Vendor A represents a lower financial and commercial risk with standard payment terms.",
                    "strengths": [
                        "Within budget boundary at ₹58,000 per unit",
                        "Favorable commercial terms (30-day net credit)",
                        "Fully complies with all mandatory requirements (16GB RAM, 3-year warranty)"
                    ],
                    "concerns": [
                        "Slower delivery timeline (25 days) compared to Vendor B",
                        "Standard technical parameters without future-proofing headroom"
                    ],
                    "recommended_actions": [
                        "Negotiate a 5% volume discount given the 100-unit quantity.",
                        "Ask if delivery can be expedited from 25 days to 15 days.",
                        "Verify if accidental damage is covered under the 3-year warranty."
                    ]
                }
            else:
                return {
                    "summary": f"{rec_name} is currently ranked highest under these weights with a score of {best_vendor['total_score']}/100. However, please inspect if it complies with all mandatory criteria.",
                    "strengths": [f"Ranked #1 with score of {best_vendor['total_score']}"],
                    "concerns": ["Please review compliance matrix for warnings."],
                    "recommended_actions": ["Clarify commercial terms before proceeding."]
                }

        # 2. Real AI recommendations grounded in stored data
        prompt = f"""
        You are a senior procurement consultant. Based on the following calculated scores and compliance summaries of vendors for the project "{project_name}" (Budget: {budget}), generate an explainable recommendation.
        
        Ranked vendors (best first):
        {json.dumps([{
            "name": v["name"],
            "total_score": v["total_score"],
            "price_score": v.get("price_score"),
            "technical_score": v.get("technical_score"),
            "warranty_score": v.get("warranty_score"),
            "delivery_score": v.get("delivery_score"),
            "payment_score": v.get("payment_score"),
            "risk_score": v.get("risk_score"),
            "has_mandatory_fail": v.get("has_mandatory_fail"),
            "risks_summary": [r["description"] for r in v.get("risks", [])]
        } for v in sorted_vendors], indent=2)}

        Provide your response in JSON format matching this schema:
        {{
            "summary": "Clear, objective reasoning paragraph explaining why the top vendor is recommended, comparing it to other options. Ground all numbers and statements strictly in the provided data. Highlight trade-offs (e.g. higher price vs better warranty).",
            "strengths": ["list of major strengths of the recommended vendor"],
            "concerns": ["list of concerns or items to watch out for with the recommended vendor"],
            "recommended_actions": ["Action Center list of 3-4 concrete next steps (e.g., 'Negotiate payment terms', 'Request warranty extension', etc.)"]
        }}
        """
        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            return json.loads(response.text)
        except Exception as e:
            print(f"Gemini API error during recommendation generation: {e}")
            # Dynamic basic fallback
            return {
                "summary": f"Based on the deterministic scoring, {best_vendor['name']} is recommended with a score of {best_vendor['total_score']}/100. It demonstrates the best balance of requirements matching, price compliance, and risk containment.",
                "strengths": [f"Highest overall score of {best_vendor['total_score']}"],
                "concerns": ["Fails some requirements" if best_vendor.get("has_mandatory_fail") else "Review risk registers for details."],
                "recommended_actions": [f"Initiate contract talks with {best_vendor['name']}.", "Confirm payment and warranty parameters."]
            }

    @staticmethod
    def generate_assistant_answer(question: str, context: Dict[str, Any]) -> str:
        """
        Generates an assistant answer. Grounded in the provided database context.
        """
        # Grounding: Build context text
        project = context.get("project", {})
        requirements = context.get("requirements", [])
        vendors = context.get("vendors", [])
        
        context_str = f"Project: {project.get('name')}\n"
        context_str += f"Budget: {project.get('budget')} {project.get('currency')}, Quantity: {project.get('quantity')}\n\n"
        
        context_str += "Requirements:\n"
        for r in requirements:
            context_str += f"- {r.get('category')} - {r.get('parameter')}: {r.get('required_value')} (Weight: {r.get('weight')}, Mandatory: {r.get('mandatory')})\n"
            
        context_str += "\nVendors & Analysis Results:\n"
        for v in vendors:
            context_str += f"Vendor Name: {v.get('name')}\n"
            score = v.get("score", {})
            context_str += f"  Total Score: {score.get('total_score')}/100\n"
            context_str += f"  Score Breakdown: Price={score.get('price_score')}, Technical={score.get('technical_score')}, Warranty={score.get('warranty_score')}, Delivery={score.get('delivery_score')}, Payment={score.get('payment_score')}, Risk={score.get('risk_score')}\n"
            
            # Compliance
            comp = v.get("compliance", [])
            context_str += "  Compliance Matrix:\n"
            for c in comp:
                context_str += f"    * {c.get('parameter')}: Required={c.get('required_value')}, Found={c.get('extracted_value')}, Status={c.get('status')} ({c.get('explanation')})\n"
                
            # Risks
            risks = v.get("risks", [])
            context_str += "  Risks:\n"
            for r in risks:
                context_str += f"    * [{r.get('severity')}] {r.get('description')} (Evidence: '{r.get('evidence')}')\n"
            context_str += "\n"

        if AIService._is_demo_active():
            # Standard QA fallback mapping for Laptop Procurement demo questions
            q = question.lower()
            if "which vendor is best" in q or "recommend" in q:
                return "Vendor B is selected as the best option with a total score of 91.0/100, followed by Vendor A (84.0/100) and Vendor C (74.0/100). Vendor B is recommended because it offers double the RAM (32GB vs 16GB/8GB) and a 5-year comprehensive onsite warranty (compared to 3 years for Vendor A and 2 years for Vendor C). Although Vendor B is slightly over budget (₹61,000 vs ₹60,000), its technical excellence and long warranty make it the best choice."
            elif "cheapest" in q or "price" in q or "cost" in q:
                return "Vendor C is the cheapest option with a unit price of ₹54,000, which is well within the ₹60,000 budget. Vendor A is ₹58,000, and Vendor B is the most expensive at ₹61,000. However, Vendor C fails the RAM requirement (offers 8GB vs required 16GB) and delivery requirement (takes 45 days vs required 30 days)."
            elif "warranty" in q:
                return "Vendor B has the best warranty offering a 5-year comprehensive onsite warranty. Vendor A offers a 3-year standard manufacturer warranty, and Vendor C offers only a 2-year warranty (failing the >= 3 years requirement)."
            elif "risk" in q:
                return "The biggest risks identified are:\n1. **Vendor B**: High risk. Requires 50% advance payment. (Evidence: '50% advance payment required upon purchase order').\n2. **Vendor C**: Multiple risk areas. It fails the mandatory RAM (8GB vs 16GB), Warranty (2 years vs 3 years), and Delivery (45 days vs 30 days) requirements."
            elif "negotiate" in q or "negotiation" in q:
                return "You should focus negotiations on the following:\n- **Vendor B**: Negotiate the 50% advance payment requirement down to standard credit terms, and request a waiver of the ₹15,000 shipping charges.\n- **Vendor A**: Negotiate a volume discount since their price is ₹58,000 (close to budget) and try to reduce their delivery time from 25 to 15 days."
            elif "why not vendor c" in q:
                return "Vendor C was not selected because it fails multiple mandatory requirements: \n- **RAM**: It offers 8GB, but >= 16GB is required.\n- **Warranty**: It offers 2 years, but >= 3 years is required.\n- **Delivery**: It takes 45 days, but <= 30 days is required.\nAlthough Vendor C is the cheapest at ₹54,000, the critical failures make it ineligible."
            else:
                # Basic context-based response for demo mode if matching query is not exact
                return f"Using stored project data: The project contains {len(vendors)} vendors. The leading candidate is {vendors[0].get('name') if vendors else 'N/A'} with a score of {vendors[0].get('score', {}).get('total_score') if vendors else 'N/A'}/100. Let me know if you need specific details about pricing, RAM, delivery, or warranty."

        # Real AI Pipeline for Chat assistant
        prompt = f"""
        You are ProcureLens Assistant, an expert procurement consultant assistant.
        Answer the user's question about the project and vendors based ONLY on the stored analysis data provided in the Context below.
        
        Rules:
        1. Ground every statement in the context (numbers, specifications, dates).
        2. Do not invent details. If the context does not contain the answer, say "I couldn't find that information in the uploaded proposals."
        3. Be brief, professional, and clear.
        
        Context:
        {context_str}
        
        Question:
        {question}
        
        Answer:
        """
        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            return f"Error retrieving answer from AI service: {e}. Fallback: Based on local analysis, Vendor B is recommended."

    @staticmethod
    def generate_negotiation_email(vendor_name: str, issues: List[str]) -> Tuple[str, str]:
        """
        Generates a professional negotiation email.
        """
        vendor_clean = vendor_name.upper().strip()
        
        # 1. Demo Mode stubs
        if AIService._is_demo_active():
            if "VENDOR B" in vendor_clean:
                subject = f"Clarification & Negotiation on Laptop Proposal - ProcureLens"
                body = (
                    f"Dear {vendor_name} Team,\n\n"
                    f"Thank you for submitting your proposal for our Laptop Procurement project. We are highly impressed by your technical specification offering 32GB RAM and the comprehensive 5-year onsite warranty.\n\n"
                    f"However, to move forward with your proposal, we need to address two commercial points:\n"
                    f"1. **Payment Terms**: Your proposal requests a 50% advance payment. Our standard corporate compliance policy does not permit advance payments of this size. We would like to propose a milestone-based framework: 10% on order confirmation and 90% within 30 days of delivery and inspection.\n"
                    f"2. **Additional Charges**: We noticed a shipping charge of ₹15,000. Given the scale of this order (100 units), we request that shipping and handling fees be waived.\n\n"
                    f"Please let us know if these terms are acceptable so we can proceed with draft contracts.\n\n"
                    f"Best regards,\n"
                    f"Procurement Operations Team\n"
                    f"ProcureLens Corporate AI"
                )
                return subject, body
            elif "VENDOR A" in vendor_clean:
                subject = f"Commercial Negotiation: Laptop Procurement - ProcureLens"
                body = (
                    f"Dear {vendor_name} Team,\n\n"
                    f"Thank you for submitting your proposal. Your offering is fully compliant with our requirements.\n\n"
                    f"As we are procuring 100 units in total, we would like to negotiate a volume discount. Your current unit price is ₹58,000, and we request a 5% discount to bring the unit price to ₹55,100.\n"
                    f"Additionally, we request if the delivery timeline could be expedited from 25 days to 15-18 days to meet our onboarding schedule.\n\n"
                    f"We look forward to your positive response.\n\n"
                    f"Best regards,\n"
                    f"Procurement Operations Team"
                )
                return subject, body
            else:
                subject = f"Clarification request regarding proposal terms - {vendor_name}"
                body = (
                    f"Dear {vendor_name} Team,\n\n"
                    f"We are reviewing your proposal and would like to request clarification on pricing, warranty, and delivery schedules to ensure alignment with our project guidelines.\n\n"
                    f"Specifically, we would like to negotiate terms for: {', '.join(issues) if issues else 'pricing and timelines'}.\n\n"
                    f"Thank you for your cooperation.\n\n"
                    f"Best regards,\n"
                    f"Procurement Team"
                )
                return subject, body

        # 2. Real AI Pipeline for Negotiation Email
        issues_str = "\n".join(f"- {i}" for i in issues)
        prompt = f"""
        You are a professional procurement officer. Write a professional negotiation email to the vendor "{vendor_name}".
        Address the following issues and negotiate better terms:
        {issues_str}

        Guidelines:
        - Maintain a collaborative and professional tone.
        - Reference specific issues and suggest reasonable alternatives (e.g. milestone payments instead of 100% advance, waiving extra shipping, extending short warranties).
        - Structure the email with Subject and Body.
        
        Output format:
        Return a JSON object containing:
        {{
            "subject": "The email subject line",
            "body": "The email body text"
        }}
        """
        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            data = json.loads(response.text)
            return data.get("subject", "Negotiation Request"), data.get("body", "")
        except Exception as e:
            print(f"Gemini API error during email generation: {e}")
            return f"Negotiation Request - {vendor_name}", f"Dear {vendor_name} Team, we would like to negotiate terms."
