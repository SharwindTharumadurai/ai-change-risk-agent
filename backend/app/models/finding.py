from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base

class Finding(Base):
    __tablename__ = "findings"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analysis_id      = Column(UUID(as_uuid=True), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False)
    finding_code     = Column(String(20),  nullable=False)
    severity         = Column(String(20),  nullable=False)
    category         = Column(String(50),  nullable=False)
    title            = Column(String(500), nullable=False)
    resource         = Column(String(500), nullable=True)
    attribute        = Column(String(500), nullable=True)
    evidence         = Column(Text,        nullable=True)
    risk_points      = Column(Integer,     nullable=False, default=0)
    explanation      = Column(Text,        nullable=True)
    remediation      = Column(Text,        nullable=True)
    remediation_code = Column(Text,        nullable=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

    analysis = relationship("Analysis", back_populates="findings")


class ComplianceResult(Base):
    __tablename__ = "compliance_results"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analysis_id  = Column(UUID(as_uuid=True), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False)
    finding_id   = Column(UUID(as_uuid=True), ForeignKey("findings.id",  ondelete="SET NULL"), nullable=True)
    framework    = Column(String(50),  nullable=False)
    control_id   = Column(String(50),  nullable=False)
    control_name = Column(String(500), nullable=True)
    status       = Column(String(20),  nullable=False)
    description  = Column(Text,        nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    analysis = relationship("Analysis", back_populates="compliance_results")


class CostImpact(Base):
    __tablename__ = "cost_impacts"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analysis_id     = Column(UUID(as_uuid=True), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False)
    resource        = Column(String(500), nullable=False)
    resource_type   = Column(String(100), nullable=True)
    change_desc     = Column(String(500), nullable=False)
    cost_before_usd = Column(Float, nullable=False, default=0)
    cost_after_usd  = Column(Float, nullable=False, default=0)
    delta_usd       = Column(Float, nullable=False, default=0)
    monthly_total   = Column(Float, nullable=False, default=0)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    analysis = relationship("Analysis", back_populates="cost_impacts")
