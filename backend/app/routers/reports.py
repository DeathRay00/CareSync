"""
Medical Reports router — handles:
  POST /api/reports/upload  (patient uploads PDF or image → Gemini analysis + embedding stored)
  GET  /api/reports/        (list reports for current patient)
  GET  /api/reports/{id}    (detail — doctor or the owner patient)
"""
import os
import uuid
from typing import List

import aiofiles
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user, require_role
from app.config import settings
from app.database import get_db
from app.models import DocumentEmbedding, MedicalReport, SourceType, User
from app.schemas import MedicalReportOut
from app.services.gemini_service import analyze_medical_report, generate_embedding

router = APIRouter(prefix="/api/reports", tags=["Medical Reports"])

ALLOWED_MIME = {
    "image/jpeg", "image/png", "image/webp",
    "application/pdf",
}


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

    # Gemini analysis
    if file.content_type == "application/pdf":
        # For PDFs we pass raw bytes as image (Gemini Flash supports PDF pages as images)
        summary = await analyze_medical_report(file_bytes, mime_type="application/pdf")
    else:
        summary = await analyze_medical_report(file_bytes, mime_type=file.content_type)

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


@router.get("/", response_model=List[MedicalReportOut])
async def list_reports(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role.value == "patient":
        condition = MedicalReport.patient_id == current_user.id
    else:
        # Doctors can search by patient_id via query param (extended in Phase 2)
        condition = True  # type: ignore

    result = await db.execute(
        select(MedicalReport)
        .where(MedicalReport.patient_id == current_user.id if current_user.role.value == "patient" else True)
        .order_by(MedicalReport.created_at.desc())
    )
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
