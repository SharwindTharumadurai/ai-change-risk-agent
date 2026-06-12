from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import uuid, time

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.analysis import Analysis
from app.models.finding import Finding, ComplianceResult, CostImpact
from app.schemas.analysis import AnalysisResponse, AnalysisListItem
from app.agent.analyzer import run_analysis

router = APIRouter()

@router.post("", response_model=AnalysisResponse)
async def create_analysis(
    file:    Optional[UploadFile] = File(None),
    content: Optional[str]        = Form(None),
    current_user: User             = Depends(get_current_user),
    db: Session                    = Depends(get_db)
):
    if not file and not content:
        raise HTTPException(status_code=400, detail="Provide a file or pasted content")

    start = time.time()

    # Read file content
    if file:
        raw = await file.read()
        file_text = raw.decode("utf-8", errors="ignore")
        file_name = file.filename or "uploaded_file"
    else:
        file_text = content
        file_name = "pasted_code.tf"

    # Create analysis record with pending status
    analysis = Analysis(
        id=uuid.uuid4(), org_id=current_user.org_id,
        user_id=current_user.id, file_name=file_name,
        status="processing"
    )
    db.add(analysis)
    db.commit()

    try:
        # Run AI analysis
        result = await run_analysis(file_text, file_name)

        # Update analysis record
        analysis.risk_score         = result.get("risk_score")
        analysis.risk_level         = result.get("risk_level")
        analysis.verdict            = result.get("verdict")
        analysis.confidence         = result.get("confidence")
        analysis.change_summary     = result.get("change_summary")
        analysis.change_types       = result.get("change_types", [])
        analysis.reasoning_summary  = result.get("reasoning_summary")
        analysis.availability_impact= result.get("availability_impact")
        analysis.status             = "complete"
        analysis.processing_ms      = int((time.time() - start) * 1000)
        analysis.completed_at       = datetime.utcnow()

        # Save cost impact
        cost = result.get("cost_impact", {})
        analysis.monthly_cost_delta = cost.get("monthly_delta_usd", 0)
        analysis.annual_cost_delta  = cost.get("annual_delta_usd", 0)

        # Save findings
        for i, f in enumerate(result.get("findings", [])):
            finding = Finding(
                id=uuid.uuid4(), analysis_id=analysis.id,
                finding_code=f.get("id", f"FIND-{i+1:03d}"),
                severity=f.get("severity", "MEDIUM"),
                category=f.get("category", "Security"),
                title=f.get("title", ""),
                resource=f.get("resource"),
                attribute=f.get("attribute"),
                evidence=f.get("evidence"),
                risk_points=f.get("risk_points", 0),
                explanation=f.get("explanation"),
                remediation=f.get("remediation"),
                remediation_code=f.get("remediation_code")
            )
            db.add(finding)
            db.flush()

            # Save compliance mappings for this finding
            for ctrl in f.get("compliance", []):
                cr = ComplianceResult(
                    id=uuid.uuid4(), analysis_id=analysis.id,
                    finding_id=finding.id,
                    framework=ctrl.get("framework", "CIS"),
                    control_id=ctrl.get("control", ""),
                    status="FAIL", description=f.get("title")
                )
                db.add(cr)

        # Save cost line items
        for item in cost.get("breakdown", []):
            ci = CostImpact(
                id=uuid.uuid4(), analysis_id=analysis.id,
                resource=item.get("resource", ""),
                change_desc=item.get("change", ""),
                delta_usd=item.get("delta_usd", 0),
                monthly_total=item.get("delta_usd", 0)
            )
            db.add(ci)

        db.commit()
        db.refresh(analysis)
        return _build_response(analysis)

    except Exception as e:
        analysis.status = "failed"
        analysis.error_message = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("", response_model=List[AnalysisListItem])
def list_analyses(
    skip: int = 0, limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Analysis)\
        .filter(Analysis.org_id == current_user.org_id)\
        .order_by(Analysis.created_at.desc())\
        .offset(skip).limit(limit).all()


@router.get("/{analysis_id}", response_model=AnalysisResponse)
def get_analysis(
    analysis_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    analysis = db.query(Analysis).filter(
        Analysis.id == uuid.UUID(analysis_id),
        Analysis.org_id == current_user.org_id
    ).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return _build_response(analysis)


def _build_response(analysis: Analysis) -> dict:
    """Build the full response dict from an Analysis ORM object."""
    findings = []
    for f in analysis.findings:
        findings.append({
            "id": str(f.id), "finding_code": f.finding_code,
            "severity": f.severity, "category": f.category,
            "title": f.title, "resource": f.resource,
            "attribute": f.attribute, "evidence": f.evidence,
            "risk_points": f.risk_points, "explanation": f.explanation,
            "remediation": f.remediation, "remediation_code": f.remediation_code,
            "compliance": []
        })

    compliance = [
        {"framework": cr.framework, "control_id": cr.control_id,
         "control_name": cr.control_name, "status": cr.status,
         "description": cr.description}
        for cr in analysis.compliance_results
    ]

    cost_impacts = [
        {"resource": ci.resource, "change_desc": ci.change_desc,
         "cost_before_usd": ci.cost_before_usd, "cost_after_usd": ci.cost_after_usd,
         "delta_usd": ci.delta_usd}
        for ci in analysis.cost_impacts
    ]

    return {
        "id": analysis.id, "file_name": analysis.file_name,
        "risk_score": analysis.risk_score, "risk_level": analysis.risk_level,
        "verdict": analysis.verdict, "confidence": analysis.confidence,
        "change_summary": analysis.change_summary,
        "change_types": analysis.change_types or [],
        "reasoning_summary": analysis.reasoning_summary,
        "availability_impact": analysis.availability_impact,
        "monthly_cost_delta": analysis.monthly_cost_delta,
        "annual_cost_delta": analysis.annual_cost_delta,
        "status": analysis.status,
        "processing_ms": analysis.processing_ms,
        "created_at": analysis.created_at,
        "findings": findings,
        "compliance_results": compliance,
        "cost_impacts": cost_impacts
    }
