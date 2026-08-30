from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Requirement Schemas ---
class RequirementBase(BaseModel):
    category: str = Field(..., description="Commercial, Technical, Delivery, Warranty, Payment, Contract")
    parameter: str = Field(..., description="e.g. RAM capacity, warranty period")
    required_value: str = Field(..., description="e.g. >= 16GB, >= 3 years")
    weight: float = Field(default=10.0, ge=0.0, le=100.0)
    mandatory: bool = Field(default=False)

class RequirementCreate(RequirementBase):
    pass

class RequirementOut(RequirementBase):
    id: int
    project_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Vendor & Proposal Schemas ---
class VendorBase(BaseModel):
    name: str

class VendorCreate(VendorBase):
    pass

class VendorOut(VendorBase):
    id: int
    project_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ProposalOut(BaseModel):
    id: int
    vendor_id: int
    file_name: str
    file_path: Optional[str] = None
    uploaded_at: datetime
    processing_status: str

    class Config:
        from_attributes = True

# --- Project Schemas ---
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    quantity: int = Field(default=1, ge=1)
    budget: Optional[float] = None
    currency: str = Field(default="INR")

class ProjectCreate(ProjectBase):
    requirements: List[RequirementCreate] = []

class ProjectOut(ProjectBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Extracted Data, Compliance & Risk ---
class ExtractedDataOut(BaseModel):
    id: int
    proposal_id: int
    category: str
    field: str
    value: Optional[str] = None
    confidence: float

    class Config:
        from_attributes = True

class ComplianceResultOut(BaseModel):
    id: int
    proposal_id: int
    requirement_id: int
    status: str
    explanation: Optional[str] = None
    evidence: Optional[str] = None
    requirement: Optional[RequirementOut] = None

    class Config:
        from_attributes = True

class RiskOut(BaseModel):
    id: int
    proposal_id: int
    type: str
    severity: str
    description: str
    recommendation: Optional[str] = None
    evidence: Optional[str] = None

    class Config:
        from_attributes = True

class VendorScoreOut(BaseModel):
    id: int
    vendor_id: int
    price_score: float
    technical_score: float
    warranty_score: float
    delivery_score: float
    payment_score: float
    risk_score: float
    total_score: float
    created_at: datetime

    class Config:
        from_attributes = True

class RecommendationOut(BaseModel):
    id: int
    project_id: int
    vendor_id: Optional[int] = None
    summary: Optional[str] = None
    strengths: Optional[List[str]] = None
    concerns: Optional[List[str]] = None
    recommended_actions: Optional[List[str]] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Detailed Project Dashboard Schema ---
class ProjectDetailOut(ProjectOut):
    requirements: List[RequirementOut] = []
    vendors: List[VendorOut] = []

    class Config:
        from_attributes = True

# --- Analysis & Simulation Requests ---
class AnalyzeRequest(BaseModel):
    pass # Trigger full pipeline

class SimulateRequest(BaseModel):
    price_weight: float
    technical_weight: float
    warranty_weight: float
    delivery_weight: float
    payment_weight: float
    risk_weight: float

class SimulateResponse(BaseModel):
    vendor_id: int
    vendor_name: str
    scores: Dict[str, float] # price_score, technical_score, etc.
    total_score: float

class AssistantRequest(BaseModel):
    question: str

class AssistantResponse(BaseModel):
    answer: str

class NegotiationEmailRequest(BaseModel):
    vendor_id: int

class NegotiationEmailResponse(BaseModel):
    subject: str
    body: str

# Pydantic schema for structured output validation from AI Service (Requirement & Proposal mapping)
class StructuredProposalData(BaseModel):
    vendor_name: str
    product_or_service: str
    unit_price: Optional[float] = None
    total_price: Optional[float] = None
    currency: str = "INR"
    quantity: Optional[int] = None
    discount: str = "NOT_SPECIFIED"
    taxes: str = "NOT_SPECIFIED"
    technical_specifications: Dict[str, Any] = {}
    warranty: str = "NOT_SPECIFIED"
    delivery_time: str = "NOT_SPECIFIED"
    payment_terms: str = "NOT_SPECIFIED"
    contract_terms: List[str] = []
    included_items: List[str] = []
    excluded_items: List[str] = []
    additional_charges: List[str] = []
    missing_information: List[str] = []
    confidence_notes: List[str] = []


# --- Auth Schemas ---
class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserOut(BaseModel):
    id: int
    username: str
    created_at: datetime

    class Config:
        from_attributes = True

