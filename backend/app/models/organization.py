from sqlalchemy import Column, String, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base

class Organization(Base):
    __tablename__ = "organizations"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name       = Column(String(255), nullable=False)
    slug       = Column(String(100), nullable=False, unique=True)
    plan       = Column(String(50), nullable=False, default="free")
    settings   = Column(JSON, nullable=False, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    users    = relationship("User",     back_populates="organization")
    analyses = relationship("Analysis", back_populates="organization")
