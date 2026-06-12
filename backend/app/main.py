from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.routers import auth, analyses, dashboard

# Create all tables on startup
# Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Change Risk Agent",
    version="1.0.0",
    description="Prevent million-dollar outages before deployment"
)

# CORS — allow frontend to call backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://ai-change-risk-agent.vercel.app",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router,      prefix="/v1/auth",      tags=["auth"])
app.include_router(analyses.router,  prefix="/v1/analyses",  tags=["analyses"])
app.include_router(dashboard.router, prefix="/v1/dashboard", tags=["dashboard"])

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ai-change-risk-agent"}
