from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List, Any

class FindingSchema(BaseModel):
    id:               Optional[UUID] = None
    finding_code:     str
    severity:         str
    category:         str
    title:            str
    resource:         Optional[str] = None
    attribute:        Optional[str] = None
    evidence:         Optional[str] = None
    risk_points:      int = 0
    explanation:      Optional[str] = None
    remediation:      Optional[str] = None
    remediation_code: Optional[str] = None
    compliance:       Optional[List[Any]] = []

    class Config:
        from_attributes = True

class CostImpactSchema(BaseModel):
    resource:        str
    change_desc:     str
    cost_before_usd: float = 0
    cost_after_usd:  float = 0
    delta_usd:       float = 0

    class Config:
        from_attributes = True

class ComplianceResultSchema(BaseModel):
    framework:    str
    control_id:   str
    control_name: Optional[str] = None
    status:       str
    description:  Optional[str] = None

    class Config:
        from_attributes = True

class AnalysisResponse(BaseModel):
    id:                  UUID
    file_name:           str
    risk_score:          Optional[int]   = None
    risk_level:          Optional[str]   = None
    verdict:             Optional[str]   = None
    confidence:          Optional[float] = None
    change_summary:      Optional[str]   = None
    change_types:        List[str]       = []
    reasoning_summary:   Optional[str]   = None
    availability_impact: Optional[str]   = None
    monthly_cost_delta:  Optional[float] = None
    annual_cost_delta:   Optional[float] = None
    status:              str
    processing_ms:       Optional[int]   = None
    created_at:          datetime
    findings:            List[FindingSchema]          = []
    compliance_results:  List[ComplianceResultSchema] = []
    cost_impacts:        List[CostImpactSchema]       = []

    class Config:
        from_attributes = True

class AnalysisListItem(BaseModel):
    id:           UUID
    file_name:    str
    risk_score:   Optional[int] = None
    risk_level:   Optional[str] = None
    verdict:      Optional[str] = None
    status:       str
    created_at:   datetime

    class Config:
        from_attributes = True
