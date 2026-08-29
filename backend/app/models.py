import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from .database import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    quantity = Column(Integer, default=1)
    budget = Column(Float, nullable=True)
    currency = Column(String, default="INR")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    requirements = relationship("Requirement", back_populates="project", cascade="all, delete-orphan")
    vendors = relationship("Vendor", back_populates="project", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="project", cascade="all, delete-orphan")


class Requirement(Base):
    __tablename__ = "requirements"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    category = Column(String, nullable=False) # Commercial, Technical, Delivery, Warranty, Payment, Contract
    parameter = Column(String, nullable=False) # e.g. RAM, Warranty Duration, delivery time
    required_value = Column(String, nullable=False) # e.g. >= 16GB, >= 3 years
    weight = Column(Float, default=10.0)
    mandatory = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", back_populates="requirements")
    compliance_results = relationship("ComplianceResult", back_populates="requirement", cascade="all, delete-orphan")


class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", back_populates="vendors")
    proposals = relationship("Proposal", back_populates="vendor", cascade="all, delete-orphan")
    scores = relationship("VendorScore", back_populates="vendor", cascade="all, delete-orphan")
    recommendation = relationship("Recommendation", back_populates="vendor", cascade="all, delete-orphan")


class Proposal(Base):
    __tablename__ = "proposals"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False)
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=True)
    extracted_text = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)
    processing_status = Column(String, default="PENDING") # PENDING, PROCESSING, COMPLETED, FAILED

    vendor = relationship("Vendor", back_populates="proposals")
    extracted_data = relationship("ExtractedData", back_populates="proposal", cascade="all, delete-orphan")
    compliance_results = relationship("ComplianceResult", back_populates="proposal", cascade="all, delete-orphan")
    risks = relationship("Risk", back_populates="proposal", cascade="all, delete-orphan")


class ExtractedData(Base):
    __tablename__ = "extracted_data"

    id = Column(Integer, primary_key=True, index=True)
    proposal_id = Column(Integer, ForeignKey("proposals.id", ondelete="CASCADE"), nullable=False)
    category = Column(String, nullable=False)
    field = Column(String, nullable=False)
    value = Column(String, nullable=True)
    confidence = Column(Float, default=1.0) # 0.0 to 1.0 confidence value

    proposal = relationship("Proposal", back_populates="extracted_data")


class ComplianceResult(Base):
    __tablename__ = "compliance_results"

    id = Column(Integer, primary_key=True, index=True)
    proposal_id = Column(Integer, ForeignKey("proposals.id", ondelete="CASCADE"), nullable=False)
    requirement_id = Column(Integer, ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, nullable=False) # MATCH, PARTIAL, FAIL, UNKNOWN
    explanation = Column(Text, nullable=True)
    evidence = Column(Text, nullable=True) # Supporting evidence from the document

    proposal = relationship("Proposal", back_populates="compliance_results")
    requirement = relationship("Requirement", back_populates="compliance_results")


class Risk(Base):
    __tablename__ = "risks"

    id = Column(Integer, primary_key=True, index=True)
    proposal_id = Column(Integer, ForeignKey("proposals.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False) # Price, Technical, Delivery, Warranty, Payment, Contract, General
    severity = Column(String, nullable=False) # LOW, MEDIUM, HIGH
    description = Column(Text, nullable=False)
    recommendation = Column(Text, nullable=True)
    evidence = Column(Text, nullable=True) # Supporting quote or evidence from text

    proposal = relationship("Proposal", back_populates="risks")


class VendorScore(Base):
    __tablename__ = "vendor_scores"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False)
    price_score = Column(Float, default=0.0)
    technical_score = Column(Float, default=0.0)
    warranty_score = Column(Float, default=0.0)
    delivery_score = Column(Float, default=0.0)
    payment_score = Column(Float, default=0.0)
    risk_score = Column(Float, default=0.0)
    total_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    vendor = relationship("Vendor", back_populates="scores")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    vendor_id = Column(Integer, ForeignKey("vendors.id", ondelete="CASCADE"), nullable=True) # Recommended vendor
    summary = Column(Text, nullable=True)
    strengths = Column(JSON, nullable=True) # List of strengths
    concerns = Column(JSON, nullable=True) # List of concerns
    recommended_actions = Column(JSON, nullable=True) # Action Center: List of next steps
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", back_populates="recommendations")
    vendor = relationship("Vendor", back_populates="recommendation")
