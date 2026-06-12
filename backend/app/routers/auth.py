from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
from app.database import get_db
from app.config import settings
from app.models.user import User
from app.models.organization import Organization
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from app.middleware.auth import get_current_user
import uuid

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": user_id, "exp": expire},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )

@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create org
    slug = req.org_name.lower().replace(" ", "-")[:50]
    org  = Organization(id=uuid.uuid4(), name=req.org_name, slug=f"{slug}-{str(uuid.uuid4())[:6]}")
    db.add(org)
    db.flush()

    # Create user
    user = User(
        id=uuid.uuid4(), org_id=org.id, email=req.email,
        full_name=req.full_name, role="admin",
        hashed_password=pwd_context.hash(req.password)
    )
    db.add(user)
    db.commit()
    return TokenResponse(access_token=create_access_token(str(user.id)))

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not pwd_context.verify(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user.last_login_at = datetime.utcnow()
    db.commit()
    return TokenResponse(access_token=create_access_token(str(user.id)))

@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user
