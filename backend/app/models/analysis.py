from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base

class Analysis(Base):
    __tablename__ = "analyses"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id              = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    user_id             = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    file_name           = Column(String(500), nullable=False)
    file_type           = Column(String(50), nullable=False, default="terraform")
    risk_score          = Column(Integer, nullable=True)
    risk_level          = Column(String(20), nullable=True)
    verdict             = Column(String(30), nullable=True)
    confidence          = Column(Float, nullable=True)
    change_types        = Column(ARRAY(String), nullable=False, default=[])
    change_summary      = Column(Text, nullable=True)
    reasoning_summary   = Column(Text, nullable=True)
    availability_impact = Column(String(20), nullable=True)
    monthly_cost_delta  = Column(Float, nullable=True)
    annual_cost_delta   = Column(Float, nullable=True)
    cost_alert_level    = Column(String(20), nullable=True)
    status              = Column(String(20), nullable=False, default="pending")
    error_message       = Column(Text, nullable=True)
    processing_ms       = Column(Integer, nullable=True)
    ai_model            = Column(String(100), nullable=True)
    created_at          = Column(DateTime(timezone=True), server_default=func.now())
    completed_at        = Column(DateTime(timezone=True), nullable=True)

    organization       = relationship("Organization", back_populates="analyses")
    user               = relationship("User",         back_populates="analyses")
    findings           = relationship("Finding",          back_populates="analysis", cascade="all, delete-orphan")
    compliance_results = relationship("ComplianceResult", back_populates="analysis", cascade="all, delete-orphan")
    cost_impacts       = relationship("CostImpact",       back_populates="analysis", cascade="all, delete-orphan")
