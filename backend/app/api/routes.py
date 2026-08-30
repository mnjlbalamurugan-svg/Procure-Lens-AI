import os
import shutil
import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
import fitz # To write PDFs for the demo creator

from ..database import get_db
from .. import models, schemas
from ..services.document_service import DocumentService
from ..services.ai_service import AIService
from ..utils.scoring_engine import ScoringEngine, parse_numeric
from ..utils.auth import verify_password, create_access_token, decode_access_token

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token. Please log in again."
        )
    username = payload.get("sub")
    if not username:
        raise HTTPException(
            status_code=401,
            detail="Token payload is invalid. Please log in again."
        )
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found. Please log in again."
        )
    return user

auth_router = APIRouter(prefix="/api/auth")

@auth_router.post("/login", response_model=schemas.Token)
def login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == login_data.username).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@auth_router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user

router = APIRouter(prefix="/api", dependencies=[Depends(get_current_user)])

# Ensure uploads directory exists
UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)


# --- Project Endpoints ---
@router.post("/projects", response_model=schemas.ProjectOut)
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db)):
    db_project = models.Project(
        name=project.name,
        description=project.description,
        quantity=project.quantity,
        budget=project.budget,
        currency=project.currency
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)

    for req in project.requirements:
        db_req = models.Requirement(
            project_id=db_project.id,
            category=req.category,
            parameter=req.parameter,
            required_value=req.required_value,
            weight=req.weight,
            mandatory=req.mandatory
        )
        db.add(db_req)
    
    db.commit()
    db.refresh(db_project)
    return db_project


@router.get("/projects", response_model=List[schemas.ProjectOut])
def list_projects(db: Session = Depends(get_db)):
    return db.query(models.Project).order_by(models.Project.created_at.desc()).all()


@router.get("/projects/{project_id}", response_model=schemas.ProjectDetailOut)
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


# --- Requirement Endpoints ---
@router.post("/projects/{project_id}/requirements", response_model=schemas.RequirementOut)
def add_requirement(project_id: int, req: schemas.RequirementCreate, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    db_req = models.Requirement(
        project_id=project_id,
        category=req.category,
        parameter=req.parameter,
        required_value=req.required_value,
        weight=req.weight,
        mandatory=req.mandatory
    )
    db.add(db_req)
    db.commit()
    db.refresh(db_req)
    return db_req


@router.get("/projects/{project_id}/requirements", response_model=List[schemas.RequirementOut])
def list_requirements(project_id: int, db: Session = Depends(get_db)):
    return db.query(models.Requirement).filter(models.Requirement.project_id == project_id).all()


# --- Vendor Endpoints ---
@router.post("/projects/{project_id}/vendors", response_model=schemas.VendorOut)
def create_vendor(project_id: int, vendor: schemas.VendorCreate, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    db_vendor = models.Vendor(project_id=project_id, name=vendor.name)
    db.add(db_vendor)
    db.commit()
    db.refresh(db_vendor)
    return db_vendor


# --- Proposal Upload Endpoint ---
@router.post("/projects/{project_id}/proposals/upload")
def upload_proposal(
    project_id: int,
    vendor_name: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 1. Resolve or create vendor
    vendor = db.query(models.Vendor).filter(
        models.Vendor.project_id == project_id, 
        models.Vendor.name == vendor_name
    ).first()
    if not vendor:
        vendor = models.Vendor(project_id=project_id, name=vendor_name)
        db.add(vendor)
        db.commit()
        db.refresh(vendor)

    # 2. Save file
    file_path = os.path.join(UPLOAD_DIR, f"{project_id}_{vendor.id}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 3. Create Proposal entry
    proposal = models.Proposal(
        vendor_id=vendor.id,
        file_name=file.filename,
        file_path=file_path,
        processing_status="PENDING"
    )
    db.add(proposal)
    db.commit()
    db.refresh(proposal)

    return {
        "proposal_id": proposal.id,
        "vendor_id": vendor.id,
        "vendor_name": vendor.name,
        "file_name": file.filename,
        "status": "UPLOADED"
    }


# --- Analysis Trigger Endpoint ---
@router.post("/projects/{project_id}/analyze")
def analyze_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check that requirements exist
    requirements = db.query(models.Requirement).filter(models.Requirement.project_id == project_id).all()
    if not requirements:
        raise HTTPException(status_code=400, detail="Please define requirements before running analysis")

    # Retrieve all vendors and proposals
    vendors = db.query(models.Vendor).filter(models.Vendor.project_id == project_id).all()
    if not vendors:
        raise HTTPException(status_code=400, detail="No vendors added to this project")

    # Group requirements as dictionaries for scoring engine
    req_dicts = [{
        "id": r.id,
        "category": r.category,
        "parameter": r.parameter,
        "required_value": r.required_value,
        "weight": r.weight,
        "mandatory": r.mandatory
    } for r in requirements]

    # Defaults for weight calculations
    default_weights = {
        "price": 30.0,
        "technical": 30.0,
        "warranty": 15.0,
        "delivery": 10.0,
        "payment": 10.0,
        "risk": 5.0
    }

    # Step 1: Extract and analyze proposals
    vendor_score_cards = []
    
    for vendor in vendors:
        proposal = db.query(models.Proposal).filter(
            models.Proposal.vendor_id == vendor.id
        ).order_by(models.Proposal.uploaded_at.desc()).first()
        
        if not proposal:
            continue
            
        proposal.processing_status = "PROCESSING"
        db.commit()

        try:
            print(f"[DIAGNOSTIC] FILE RECEIVED: {proposal.file_name} for vendor {vendor.name}")
            # A: File text extraction
            extracted_text = ""
            if proposal.file_path and os.path.exists(proposal.file_path):
                extracted_text = DocumentService.extract_text(proposal.file_path)
            else:
                extracted_text = "No file uploaded. Extracted text is empty."
            
            print(f"[DIAGNOSTIC] TEXT EXTRACTED: {proposal.file_name} | CHARACTER COUNT: {len(extracted_text)}")
            proposal.extracted_text = extracted_text
            
            # B: AI structured extraction
            structured_data = AIService.analyze_proposal(extracted_text, vendor.name)
            print(f"[DIAGNOSTIC] AI EXTRACTION COMPLETED for {vendor.name}")
            
            # Clear old extracted data
            db.query(models.ExtractedData).filter(models.ExtractedData.proposal_id == proposal.id).delete()
            
            # Save extracted parameters to DB
            fields = {
                "product_or_service": (structured_data.product_or_service, 1.0),
                "unit_price": (structured_data.unit_price, 1.0),
                "total_price": (structured_data.total_price, 1.0),
                "currency": (structured_data.currency, 1.0),
                "quantity": (structured_data.quantity, 1.0),
                "discount": (structured_data.discount, 0.8),
                "taxes": (structured_data.taxes, 0.8),
                "warranty": (structured_data.warranty, 0.9),
                "delivery_time": (structured_data.delivery_time, 0.9),
                "payment_terms": (structured_data.payment_terms, 0.9)
            }
            
            # Add technical specs to DB fields
            for tech_k, tech_v in (structured_data.technical_specifications or {}).items():
                fields[tech_k] = (str(tech_v), 0.9)

            for key, val_conf in fields.items():
                val, conf = val_conf
                db_field = models.ExtractedData(
                    proposal_id=proposal.id,
                    category="general",
                    field=key,
                    value=str(val) if val is not None else "UNKNOWN",
                    confidence=conf
                )
                db.add(db_field)
            print(f"[DIAGNOSTIC] STRUCTURED DATA SAVED for {vendor.name}")

            # C: AI Risk Analysis
            db.query(models.Risk).filter(models.Risk.proposal_id == proposal.id).delete()
            ai_risks = AIService.identify_risks(structured_data.model_dump(), vendor.name)
            
            for risk in ai_risks:
                db_risk = models.Risk(
                    proposal_id=proposal.id,
                    type=risk.get("type", "General"),
                    severity=risk.get("severity", "LOW"),
                    description=risk.get("description", ""),
                    recommendation=risk.get("recommendation", ""),
                    evidence=risk.get("evidence", "NOT_SPECIFIED")
                )
                db.add(db_risk)
            db.commit()

            # D: Compliance & Score Mapping
            # Compile extracted dictionary for scoring
            flat_extracted = {f.field: f.value for f in proposal.extracted_data}
            flat_extracted["unit_price"] = structured_data.unit_price
            flat_extracted["warranty"] = structured_data.warranty
            flat_extracted["delivery_time"] = structured_data.delivery_time
            flat_extracted["payment_terms"] = structured_data.payment_terms
            flat_extracted["technical_specifications"] = structured_data.technical_specifications
            
            score_card = ScoringEngine.calculate_scores(
                requirements=req_dicts,
                extracted_fields=flat_extracted,
                weights=default_weights,
                risks=ai_risks,
                project_budget=project.budget
            )
            
            # Save compliance results
            db.query(models.ComplianceResult).filter(models.ComplianceResult.proposal_id == proposal.id).delete()
            for comp in score_card["compliance_results"]:
                db_comp = models.ComplianceResult(
                    proposal_id=proposal.id,
                    requirement_id=comp["requirement_id"],
                    status=comp["status"],
                    explanation=comp["explanation"],
                    evidence=comp["evidence"]
                )
                db.add(db_comp)
            print(f"[DIAGNOSTIC] COMPLIANCE COMPLETED for {vendor.name}")
                
            # Save scores
            db.query(models.VendorScore).filter(models.VendorScore.vendor_id == vendor.id).delete()
            db_score = models.VendorScore(
                vendor_id=vendor.id,
                price_score=score_card["price_score"],
                technical_score=score_card["technical_score"],
                warranty_score=score_card["warranty_score"],
                delivery_score=score_card["delivery_score"],
                payment_score=score_card["payment_score"],
                risk_score=score_card["risk_score"],
                total_score=score_card["total_score"]
            )
            db.add(db_score)
            print(f"[DIAGNOSTIC] SCORING COMPLETED for {vendor.name}")
            
            proposal.processing_status = "COMPLETED"
            
            # Pack details for overall recommendation
            vendor_score_cards.append({
                "id": vendor.id,
                "name": vendor.name,
                "total_score": score_card["total_score"],
                "price_score": score_card["price_score"],
                "technical_score": score_card["technical_score"],
                "warranty_score": score_card["warranty_score"],
                "delivery_score": score_card["delivery_score"],
                "payment_score": score_card["payment_score"],
                "risk_score": score_card["risk_score"],
                "has_mandatory_fail": score_card["has_mandatory_fail"],
                "risks": ai_risks
            })
            
        except Exception as err:
            proposal.processing_status = "FAILED"
            db.commit()
            print(f"Error analyzing vendor {vendor.name}: {err}")
            
    db.commit()

    # Step 2: Calculate Overall Recommendation using AI grounded in calculations
    if vendor_score_cards:
        db.query(models.Recommendation).filter(models.Recommendation.project_id == project_id).delete()
        
        ai_rec = AIService.generate_recommendation_summary(
            project_name=project.name,
            budget=project.budget or 0.0,
            vendors_summary=vendor_score_cards
        )
        
        # Identify recommended vendor ID from scores
        sorted_cards = sorted(vendor_score_cards, key=lambda x: x["total_score"], reverse=True)
        recommended_vendor_id = sorted_cards[0]["id"] if sorted_cards else None
        
        db_rec = models.Recommendation(
            project_id=project_id,
            vendor_id=recommended_vendor_id,
            summary=ai_rec.get("summary"),
            strengths=ai_rec.get("strengths", []),
            concerns=ai_rec.get("concerns", []),
            recommended_actions=ai_rec.get("recommended_actions", [])
        )
        db.add(db_rec)
        db.commit()

    return {"status": "SUCCESS", "message": f"Successfully analyzed {len(vendor_score_cards)} proposals"}


# --- Dashboard / Details Endpoints ---
@router.get("/projects/{project_id}/comparison")
def get_project_comparison(project_id: int, db: Session = Depends(get_db)):
    vendors = db.query(models.Vendor).filter(models.Vendor.project_id == project_id).all()
    requirements = db.query(models.Requirement).filter(models.Requirement.project_id == project_id).all()
    
    response_data = []
    
    for vendor in vendors:
        proposal = db.query(models.Proposal).filter(models.Proposal.vendor_id == vendor.id).order_by(models.Proposal.uploaded_at.desc()).first()
        score = db.query(models.VendorScore).filter(models.VendorScore.vendor_id == vendor.id).first()
        
        compliance_list = []
        extracted_data_list = []
        raw_text = ""
        if proposal:
            raw_text = proposal.extracted_text or ""
            compliance = db.query(models.ComplianceResult).filter(models.ComplianceResult.proposal_id == proposal.id).all()
            for c in compliance:
                compliance_list.append({
                    "requirement_id": c.requirement_id,
                    "status": c.status,
                    "explanation": c.explanation,
                    "evidence": c.evidence
                })
                
            extracted = db.query(models.ExtractedData).filter(models.ExtractedData.proposal_id == proposal.id).all()
            for e in extracted:
                extracted_data_list.append({
                    "field": e.field,
                    "value": e.value,
                    "confidence": e.confidence
                })

        response_data.append({
            "vendor_id": vendor.id,
            "vendor_name": vendor.name,
            "has_proposal": proposal is not None,
            "processing_status": proposal.processing_status if proposal else None,
            "extracted_text": raw_text,
            "extracted_data": extracted_data_list,
            "scores": {
                "price": score.price_score if score else 0.0,
                "technical": score.technical_score if score else 0.0,
                "warranty": score.warranty_score if score else 0.0,
                "delivery": score.delivery_score if score else 0.0,
                "payment": score.payment_score if score else 0.0,
                "risk": score.risk_score if score else 0.0,
                "total": score.total_score if score else 0.0
            } if score else None,
            "compliance": compliance_list
        })
        
    return {
        "requirements": [{
            "id": r.id,
            "category": r.category,
            "parameter": r.parameter,
            "required_value": r.required_value,
            "weight": r.weight,
            "mandatory": r.mandatory
        } for r in requirements],
        "vendors": response_data
    }


@router.get("/projects/{project_id}/risks")
def get_project_risks(project_id: int, db: Session = Depends(get_db)):
    vendors = db.query(models.Vendor).filter(models.Vendor.project_id == project_id).all()
    all_risks = []
    
    for v in vendors:
        proposal = db.query(models.Proposal).filter(models.Proposal.vendor_id == v.id).order_by(models.Proposal.uploaded_at.desc()).first()
        if proposal:
            risks = db.query(models.Risk).filter(models.Risk.proposal_id == proposal.id).all()
            for r in risks:
                all_risks.append({
                    "id": r.id,
                    "vendor_id": v.id,
                    "vendor_name": v.name,
                    "type": r.type,
                    "severity": r.severity,
                    "description": r.description,
                    "recommendation": r.recommendation,
                    "evidence": r.evidence
                })
    return all_risks


@router.get("/projects/{project_id}/recommendation")
def get_project_recommendation(project_id: int, db: Session = Depends(get_db)):
    rec = db.query(models.Recommendation).filter(models.Recommendation.project_id == project_id).first()
    if not rec:
        return {
            "vendor_name": "No Analysis Done",
            "summary": "Please upload proposals and click 'Analyze Proposals' to generate recommendations.",
            "strengths": [],
            "concerns": [],
            "recommended_actions": []
        }
        
    vendor_name = "N/A"
    total_score = 0.0
    if rec.vendor_id:
        vendor = db.query(models.Vendor).filter(models.Vendor.id == rec.vendor_id).first()
        if vendor:
            vendor_name = vendor.name
            score = db.query(models.VendorScore).filter(models.VendorScore.vendor_id == vendor.id).first()
            if score:
                total_score = score.total_score
                
    return {
        "vendor_id": rec.vendor_id,
        "vendor_name": vendor_name,
        "total_score": total_score,
        "summary": rec.summary,
        "strengths": rec.strengths,
        "concerns": rec.concerns,
        "recommended_actions": rec.recommended_actions
    }


# --- Assistant Chat Endpoint ---
@router.post("/projects/{project_id}/assistant", response_model=schemas.AssistantResponse)
def run_assistant(project_id: int, request: schemas.AssistantRequest, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    requirements = db.query(models.Requirement).filter(models.Requirement.project_id == project_id).all()
    vendors = db.query(models.Vendor).filter(models.Vendor.project_id == project_id).all()
    
    # Compile a detailed context dictionary to send to AIService
    context_vendors = []
    for v in vendors:
        proposal = db.query(models.Proposal).filter(models.Proposal.vendor_id == v.id).order_by(models.Proposal.uploaded_at.desc()).first()
        score = db.query(models.VendorScore).filter(models.VendorScore.vendor_id == v.id).first()
        
        extracted_data_list = []
        compliance_list = []
        risks_list = []
        
        if proposal:
            extracted = db.query(models.ExtractedData).filter(models.ExtractedData.proposal_id == proposal.id).all()
            compliance = db.query(models.ComplianceResult).filter(models.ComplianceResult.proposal_id == proposal.id).all()
            risks = db.query(models.Risk).filter(models.Risk.proposal_id == proposal.id).all()
            
            extracted_data_list = [{"field": e.field, "value": e.value} for e in extracted]
            compliance_list = [{
                "parameter": c.requirement.parameter,
                "required_value": c.requirement.required_value,
                "extracted_value": c.evidence,
                "status": c.status,
                "explanation": c.explanation
            } for c in compliance if c.requirement]
            risks_list = [{
                "severity": r.severity,
                "description": r.description,
                "evidence": r.evidence
            } for r in risks]
            
        context_vendors.append({
            "name": v.name,
            "score": {
                "total_score": score.total_score if score else 0.0,
                "price_score": score.price_score if score else 0.0,
                "technical_score": score.technical_score if score else 0.0,
                "warranty_score": score.warranty_score if score else 0.0,
                "delivery_score": score.delivery_score if score else 0.0,
                "payment_score": score.payment_score if score else 0.0,
                "risk_score": score.risk_score if score else 0.0
            } if score else {},
            "extracted": extracted_data_list,
            "compliance": compliance_list,
            "risks": risks_list
        })
        
    context = {
        "project": {
            "name": project.name,
            "budget": project.budget,
            "currency": project.currency,
            "quantity": project.quantity
        },
        "requirements": [{
            "category": r.category,
            "parameter": r.parameter,
            "required_value": r.required_value,
            "weight": r.weight,
            "mandatory": r.mandatory
        } for r in requirements],
        "vendors": context_vendors
    }
    
    answer = AIService.generate_assistant_answer(request.question, context)
    return schemas.AssistantResponse(answer=answer)


# --- Simulation (Recalculate weights) Endpoint ---
@router.post("/projects/{project_id}/simulate", response_model=List[schemas.SimulateResponse])
def run_simulation(project_id: int, request: schemas.SimulateRequest, db: Session = Depends(get_db)):
    vendors = db.query(models.Vendor).filter(models.Vendor.project_id == project_id).all()
    requirements = db.query(models.Requirement).filter(models.Requirement.project_id == project_id).all()
    
    weights = {
        "price": request.price_weight,
        "technical": request.technical_weight,
        "warranty": request.warranty_weight,
        "delivery": request.delivery_weight,
        "payment": request.payment_weight,
        "risk": request.risk_weight
    }
    
    req_dicts = [{
        "id": r.id,
        "category": r.category,
        "parameter": r.parameter,
        "required_value": r.required_value,
        "weight": r.weight,
        "mandatory": r.mandatory
    } for r in requirements]
    
    simulation_results = []
    
    for vendor in vendors:
        proposal = db.query(models.Proposal).filter(models.Proposal.vendor_id == vendor.id).order_by(models.Proposal.uploaded_at.desc()).first()
        if not proposal:
            continue
            
        # Get stored risks and compliance structures to recalculate
        risks = db.query(models.Risk).filter(models.Risk.proposal_id == proposal.id).all()
        risk_dicts = [{"severity": r.severity, "description": r.description} for r in risks]
        
        flat_extracted = {}
        extracted_fields = db.query(models.ExtractedData).filter(models.ExtractedData.proposal_id == proposal.id).all()
        for f in extracted_fields:
            flat_extracted[f.field] = f.value
            
        # Retrieve original extracted unit price, warranty, delivery, etc. if available
        # Find unit price specifically
        unit_price_f = db.query(models.ExtractedData).filter(models.ExtractedData.proposal_id == proposal.id, models.ExtractedData.field == "unit_price").first()
        if unit_price_f:
            flat_extracted["unit_price"] = parse_numeric(unit_price_f.value)
            
        rec_score = ScoringEngine.calculate_scores(
            requirements=req_dicts,
            extracted_fields=flat_extracted,
            weights=weights,
            risks=risk_dicts,
            project_budget=db.query(models.Project).filter(models.Project.id == project_id).first().budget
        )
        
        simulation_results.append(schemas.SimulateResponse(
            vendor_id=vendor.id,
            vendor_name=vendor.name,
            scores={
                "price": rec_score["price_score"],
                "technical": rec_score["technical_score"],
                "warranty": rec_score["warranty_score"],
                "delivery": rec_score["delivery_score"],
                "payment": rec_score["payment_score"],
                "risk": rec_score["risk_score"]
            },
            total_score=rec_score["total_score"]
        ))
        
    # Sort simulation results by total score descending
    simulation_results.sort(key=lambda x: x.total_score, reverse=True)
    return simulation_results


# --- Negotiation Email Endpoint ---
@router.post("/projects/{project_id}/negotiation-email", response_model=schemas.NegotiationEmailResponse)
def get_negotiation_email(project_id: int, request: schemas.NegotiationEmailRequest, db: Session = Depends(get_db)):
    vendor = db.query(models.Vendor).filter(models.Vendor.id == request.vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
        
    proposal = db.query(models.Proposal).filter(models.Proposal.vendor_id == vendor.id).order_by(models.Proposal.uploaded_at.desc()).first()
    issues = []
    if proposal:
        # Get risks and failing compliance items to feed into negotiation prompt
        risks = db.query(models.Risk).filter(models.Risk.proposal_id == proposal.id).all()
        failures = db.query(models.ComplianceResult).filter(
            models.ComplianceResult.proposal_id == proposal.id,
            models.ComplianceResult.status.in_(["FAIL", "PARTIAL"])
        ).all()
        
        for r in risks:
            issues.append(f"{r.type} issue: {r.description}")
        for f in failures:
            if f.requirement:
                issues.append(f"Compliance deviation on {f.requirement.parameter}: Required {f.requirement.required_value}, offered {f.evidence}")
                
    subject, body = AIService.generate_negotiation_email(vendor.name, issues)
    return schemas.NegotiationEmailResponse(subject=subject, body=body)


# --- Seeding Endpoint for Laptop Procurement Demo ---
@router.get("/projects/demo/load")
def seed_demo_project(db: Session = Depends(get_db)):
    # 1. Clean existing Laptop Procurement demo projects if any
    old_project = db.query(models.Project).filter(models.Project.name == "Laptop Procurement").first()
    if old_project:
        db.delete(old_project)
        db.commit()

    # 2. Create the Project
    project = models.Project(
        name="Laptop Procurement",
        description="Enterprise-wide procurement of 100 laptops for staff onboarding. Prioritizing performance, long warranty, and commercial viability.",
        quantity=100,
        budget=60000.0, # Budget unit price threshold
        currency="INR"
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # 3. Create Requirements
    reqs = [
        models.Requirement(project_id=project.id, category="Commercial", parameter="Unit Price", required_value="<= ₹60000", weight=30.0, mandatory=True),
        models.Requirement(project_id=project.id, category="Technical", parameter="RAM", required_value=">= 16GB", weight=30.0, mandatory=True),
        models.Requirement(project_id=project.id, category="Warranty", parameter="Warranty", required_value=">= 3 years", weight=15.0, mandatory=True),
        models.Requirement(project_id=project.id, category="Delivery", parameter="Delivery Time", required_value="<= 30 days", weight=10.0, mandatory=True),
        models.Requirement(project_id=project.id, category="Payment", parameter="Payment Terms", required_value="30-day credit", weight=10.0, mandatory=False)
    ]
    for r in reqs:
        db.add(r)
    db.commit()

    # 4. Create Vendors and programmatically write dummy proposals
    vendor_data = [
        {
            "name": "Vendor A",
            "file": "vendor_a.pdf",
            "content": """
            VENDOR A PROPOSAL FOR LAPTOP SUPPLY
            
            Product Details: Standard Corporate Laptop Series A
            Quantity: 100 Units
            Unit Price: Rs. 58,000 inclusive of packaging.
            Total Cost: Rs. 5,800,000.
            
            Technical Specs:
            - RAM: 16GB DDR4 memory
            - SSD: 512GB NVMe Storage
            - CPU: Intel Core i5 12th Generation
            - Screen: 14-inch Full HD display
            
            Warranty & Support:
            - 3 years manufacturer warranty. Coverage starts on delivery.
            
            Logistics:
            - Delivery scheduled in 25 days following signed order confirmation.
            
            Commercial Terms:
            - Payment terms: 30-day credit from delivery date.
            """
        },
        {
            "name": "Vendor B",
            "file": "vendor_b.pdf",
            "content": """
            OFFICIAL PROPOSAL FROM VENDOR B
            
            Prepared for: Enterprise Laptop Procurement Project
            Item: Premium Office Pro Book v12
            Base Price: Rs. 61,000 per unit.
            Subtotal: Rs. 6,100,000 for 100 units.
            Taxes: 18% GST extra.
            Shipping Fee: Rs. 15,000 flat rate extra.
            
            Technical Specifications:
            - RAM: 32GB DDR5 high-speed memory
            - Storage: 1TB PCIe NVMe SSD
            - Processor: Intel Core i7 13th Gen
            - Display: 15.6-inch IPS screen
            
            Warranty & Onsite SLA:
            - 5 years comprehensive onsite warranty including parts and engineering support.
            
            Logistics:
            - Delivery is guaranteed within 20 days of order confirmation.
            
            Commercial Terms:
            - 50% advance payment required upon purchase order issuance. Remaining 50% upon delivery.
            """
        },
        {
            "name": "Vendor C",
            "file": "vendor_c.pdf",
            "content": """
            BUDGET ENTERPRISE LAPTOP PROPOSAL - VENDOR C
            
            Model: Value Book C14
            Volume Quantity: 100
            Unit Price: Rs. 54,000 (includes 10% volume discount).
            Total price: Rs. 5,400,000. All taxes and delivery charges included.
            
            Specs:
            - RAM: 8GB DDR4 RAM
            - SSD: 256GB SSD Storage
            - Processor: Intel Core i3 11th Gen
            - Screen: 14-inch HD display
            
            Warranty:
            - 2 years warranty. Carry-in service support.
            
            Delivery:
            - Delivery takes up to 45 days due to logistics backlogs.
            
            Payment terms:
            - 30-day net credit from delivery.
            """
        }
    ]

    for data in vendor_data:
        vendor = models.Vendor(project_id=project.id, name=data["name"])
        db.add(vendor)
        db.commit()
        db.refresh(vendor)
        
        # Write programmatic dummy PDF using fitz
        file_path = os.path.join(UPLOAD_DIR, f"{project.id}_{vendor.id}_{data['file']}")
        try:
            doc = fitz.open()
            page = doc.new_page()
            page.insert_text((50, 50), data["content"])
            doc.save(file_path)
        except Exception as pdf_err:
            print(f"Error writing PDF {data['file']}: {pdf_err}")
            # Fallback to plain txt write
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(data["content"])

        proposal = models.Proposal(
            vendor_id=vendor.id,
            file_name=data["file"],
            file_path=file_path,
            processing_status="PENDING"
        )
        db.add(proposal)
        db.commit()

    return {"status": "SUCCESS", "project_id": project.id}
