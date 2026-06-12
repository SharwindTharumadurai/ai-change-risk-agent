from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.analysis import Analysis
from app.models.finding import Finding
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/stats")
def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    base = db.query(Analysis).filter(
        Analysis.org_id == current_user.org_id,
        Analysis.status == "complete"
    )
    total    = base.count()
    blocked  = base.filter(Analysis.verdict == "BLOCK_DEPLOYMENT").count()
    review   = base.filter(Analysis.verdict == "REVIEW_REQUIRED").count()
    safe     = base.filter(Analysis.verdict == "SAFE_TO_DEPLOY").count()
    avg_score = db.query(func.avg(Analysis.risk_score)).filter(
        Analysis.org_id == current_user.org_id,
        Analysis.status == "complete"
    ).scalar() or 0

    return {
        "total": total, "blocked": blocked,
        "review": review, "safe": safe,
        "avg_risk_score": round(float(avg_score), 1)
    }

@router.get("/trends")
def get_trends(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    since = datetime.utcnow() - timedelta(days=days)
    analyses = db.query(Analysis).filter(
        Analysis.org_id == current_user.org_id,
        Analysis.status == "complete",
        Analysis.created_at >= since
    ).order_by(Analysis.created_at.asc()).all()

    return [{
        "date": str(a.created_at.date()),
        "risk_score": a.risk_score,
        "verdict": a.verdict
    } for a in analyses]

@router.get("/findings")
def get_finding_breakdown(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Join findings through analyses to filter by org
    rows = db.query(Finding.category, func.count(Finding.id))\
        .join(Analysis, Finding.analysis_id == Analysis.id)\
        .filter(Analysis.org_id == current_user.org_id)\
        .group_by(Finding.category).all()

    return [{"category": r[0], "count": r[1]} for r in rows]
