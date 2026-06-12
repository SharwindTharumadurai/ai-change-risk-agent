from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id          = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    email           = Column(String(255), nullable=False, unique=True)
    full_name       = Column(String(255), nullable=False)
    role            = Column(String(50), nullable=False, default="engineer")
    hashed_password = Column(String(255), nullable=False)
    is_active       = Column(Boolean, nullable=False, default=True)
    last_login_at   = Column(DateTime(timezone=True), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    organization = relationship("Organization", back_populates="users")
    analyses     = relationship("Analysis",     back_populates="user")
