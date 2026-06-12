from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from typing import Optional

class RegisterRequest(BaseModel):
    email:     EmailStr
    password:  str
    full_name: str
    org_name:  str

class LoginRequest(BaseModel):
    email:    EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"

class UserResponse(BaseModel):
    id:        UUID
    email:     str
    full_name: str
    role:      str
    org_id:    UUID

    class Config:
        from_attributes = True
