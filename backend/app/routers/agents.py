from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.multi_agent_service import analyze_report_with_agents

router = APIRouter(prefix="/agents", tags=["Agents"])

class ReportAnalysisRequest(BaseModel):
    report_content: str

@router.post("/analyze")
async def process_report(request: ReportAnalysisRequest):
    try:
        # Trigger Groq (extractor) first, then Mistral (analyst)
        result = analyze_report_with_agents(request.report_content)
        
        # CrewAI kickoff returns a CrewOutput, we safely convert it to string
        return {"status": "success", "result": str(result)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
