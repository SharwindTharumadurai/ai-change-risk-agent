from openai import AsyncOpenAI
from app.agent.prompts import SYSTEM_PROMPT, build_user_prompt
from app.config import settings
import json

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

# JSON schema for structured output - enforces consistent response shape
RESPONSE_SCHEMA = {
    "type": "json_schema",
    "json_schema": {
        "name": "risk_report",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "risk_score":         {"type": "integer",  "description": "0-100 overall risk score"},
                "risk_level":         {"type": "string",   "description": "LOW | MEDIUM | HIGH | CRITICAL"},
                "verdict":            {"type": "string",   "description": "SAFE_TO_DEPLOY | REVIEW_REQUIRED | BLOCK_DEPLOYMENT"},
                "confidence":         {"type": "number",   "description": "0.0-1.0 confidence in the assessment"},
                "change_summary":     {"type": "string",   "description": "1-2 sentence summary of what changed"},
                "change_types":       {"type": "array",    "items": {"type": "string"}, "description": "e.g. IAM, Networking, Compute"},
                "availability_impact":{"type": "string",   "description": "NONE | LOW | MEDIUM | HIGH | CRITICAL"},
                "reasoning_summary":  {"type": "string",   "description": "Paragraph explaining the verdict"},
                "findings": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id":               {"type": "string"},
                            "severity":         {"type": "string"},
                            "category":         {"type": "string"},
                            "title":            {"type": "string"},
                            "resource":         {"type": "string"},
                            "attribute":        {"type": "string"},
                            "evidence":         {"type": "string"},
                            "risk_points":      {"type": "integer"},
                            "explanation":      {"type": "string"},
                            "remediation":      {"type": "string"},
                            "remediation_code": {"type": "string"},
                            "compliance": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "framework": {"type": "string"},
                                        "control":   {"type": "string"}
                                    },
                                    "required": ["framework", "control"],
                                    "additionalProperties": False
                                }
                            }
                        },
                        "required": ["id","severity","category","title","resource",
                                     "attribute","evidence","risk_points",
                                     "explanation","remediation","remediation_code","compliance"],
                        "additionalProperties": False
                    }
                },
                "cost_impact": {
                    "type": "object",
                    "properties": {
                        "monthly_delta_usd": {"type": "number"},
                        "annual_delta_usd":  {"type": "number"},
                        "breakdown": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "resource":  {"type": "string"},
                                    "change":    {"type": "string"},
                                    "delta_usd": {"type": "number"}
                                },
                                "required": ["resource","change","delta_usd"],
                                "additionalProperties": False
                            }
                        }
                    },
                    "required": ["monthly_delta_usd","annual_delta_usd","breakdown"],
                    "additionalProperties": False
                }
            },
            "required": ["risk_score","risk_level","verdict","confidence",
                         "change_summary","change_types","availability_impact",
                         "reasoning_summary","findings","cost_impact"],
            "additionalProperties": False
        }
    }
}

async def run_analysis(file_content: str, filename: str) -> dict:
    """
    Run the full AI risk analysis on a file.
    Returns a dict matching the risk report schema.
    """
    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        response_format=RESPONSE_SCHEMA,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": build_user_prompt(file_content, filename)}
        ],
        max_tokens=2000,
        temperature=0.1   # low = consistent, deterministic scoring
    )

    result = json.loads(response.choices[0].message.content)
    return result
