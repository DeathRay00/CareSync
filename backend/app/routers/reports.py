"""
Medical Reports router — handles:
  POST /api/reports/upload  (patient uploads PDF or image → Gemini analysis + embedding stored)
  GET  /api/reports/        (list reports for current patient)
  GET  /api/reports/{id}    (detail — doctor or the owner patient)
"""
import os
import uuid
from typing import List, Optional

import aiofiles
import fitz # PyMuPDF
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user, require_role
from app.config import settings
from app.database import get_db
from app.models import DocumentEmbedding, MedicalReport, SourceType, User
from app.schemas import MedicalReportOut

# Updated to use Mistral service
from app.services.mistral_service import analyze_medical_report, generate_embedding

router = APIRouter(prefix="/api/reports", tags=["Medical Reports"])

ALLOWED_MIME = {
    "image/jpeg", "image/png", "image/webp",
    "application/pdf",
}


def extract_text_from_pdf(filepath: str) -> str:
    text = ""
    try:
        with fitz.open(filepath) as doc:
            for page in doc:
                text += page.get_text()
    except Exception as e:
        raise HTTPException(status_code=400, detail="Failed to parse PDF document.")
    
    if not text.strip():
        raise HTTPException(status_code=400, detail="PDF contains no readable text (it might be a scanned image).")
    
    return text


@router.post("/upload", response_model=MedicalReportOut, status_code=status.HTTP_201_CREATED)
async def upload_report(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("patient")),
):
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail="Only PDF or image files are allowed")

    file_bytes = await file.read()
    if len(file_bytes) > 20 * 1024 * 1024:  # 20 MB limit
        raise HTTPException(status_code=400, detail="File too large (max 20 MB)")

    # Save file
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    ext = os.path.splitext(file.filename or "report")[1] or ".bin"
    filename = f"report_{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    async with aiofiles.open(filepath, "wb") as f:
        await f.write(file_bytes)

    try:
        extracted_text = ""
        
        # Extract text dynamically based on MIME
        if file.content_type == "application/pdf":
            extracted_text = extract_text_from_pdf(filepath)
        else:
            raise HTTPException(status_code=400, detail="Image OCR not yet implemented for Mistral pipeline.")

        # Mistral analysis
        summary = await analyze_medical_report(extracted_text)

        # Persist report
        report = MedicalReport(
            patient_id=current_user.id,
            file_url=f"/uploads/{filename}",
            original_filename=file.filename,
            ai_analysis_summary=summary,
        )
        db.add(report)
        await db.commit()
        await db.refresh(report)

        # Generate and store embedding for RAG
        embedding_vector = await generate_embedding(summary)
        embedding = DocumentEmbedding(
            patient_id=current_user.id,
            report_id=report.id,
            source_type=SourceType.report,
            content_text=summary,
            embedding=embedding_vector,
        )
        db.add(embedding)
        await db.commit()

        return report
    except Exception as e:
        await db.rollback()
        if os.path.exists(filepath):
            os.remove(filepath)
        raise HTTPException(status_code=500, detail=f"Failed to process report: {str(e)}")


@router.get("/", response_model=List[MedicalReportOut])
async def list_reports(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    patient_id: Optional[uuid.UUID] = None
):
    query = select(MedicalReport)
    
    if current_user.role.value == "patient":
        query = query.where(MedicalReport.patient_id == current_user.id)
    elif patient_id:
        query = query.where(MedicalReport.patient_id == patient_id)

    result = await db.execute(query.order_by(MedicalReport.created_at.desc()))
    return result.scalars().all()


@router.get("/{report_id}", response_model=MedicalReportOut)
async def get_report(
    report_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(MedicalReport).where(MedicalReport.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if current_user.role.value == "patient" and report.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return report


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(
    report_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("patient")),
):
    result = await db.execute(select(MedicalReport).where(MedicalReport.id == report_id))
    report = result.scalar_one_or_none()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    if report.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Delete associated file from disk if it exists
    if report.file_url:
        # file_url is saved as "/uploads/filename.ext", let's extract the filename
        filename = os.path.basename(report.file_url)
        filepath = os.path.join(settings.UPLOAD_DIR, filename)
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except Exception as e:
                pass # Continue with DB deletion even if file removal fails

    # Delete embeddings and then the report
    await db.execute(DocumentEmbedding.__table__.delete().where(DocumentEmbedding.report_id == report_id))
    await db.delete(report)
    await db.commit()
    
    return None
