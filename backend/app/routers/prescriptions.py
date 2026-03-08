"""
Prescription router — handles:
  POST /api/prescriptions/upload-image  (patient uploads handwritten image → Gemini OCR)
  POST /api/prescriptions/              (doctor writes digital prescription)
  GET  /api/prescriptions/              (list for current user)
  GET  /api/prescriptions/{id}          (detail)
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
from app.models import Prescription, User
from app.schemas import PrescriptionCreate, PrescriptionOut
from app.services.gemini_service import extract_prescription_from_image

router = APIRouter(prefix="/api/prescriptions", tags=["Prescriptions"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


# ─── Patient: upload handwritten prescription image ──────────────────────────

@router.post("/upload-image", response_model=PrescriptionOut, status_code=status.HTTP_201_CREATED)
async def upload_prescription_image(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("patient")),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG/PNG/WEBP images are allowed")

    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:  # 10 MB limit
        raise HTTPException(status_code=400, detail="File too large (max 10 MB)")

    # Save file
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filename = f"rx_{uuid.uuid4().hex}{os.path.splitext(file.filename or '')[1]}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    async with aiofiles.open(filepath, "wb") as f:
        await f.write(image_bytes)

    # Gemini OCR
    extracted = await extract_prescription_from_image(image_bytes, file.content_type)

    prescription = Prescription(
        patient_id=current_user.id,
        doctor_id=None,
        medication_details=extracted,
        raw_text=extracted.get("raw_text", ""),
        is_uploaded_image=True,
        image_url=f"/uploads/{filename}",
    )
    db.add(prescription)
    await db.commit()
    await db.refresh(prescription)
    return prescription


# ─── Doctor: write digital prescription ──────────────────────────────────────

@router.post("/", response_model=PrescriptionOut, status_code=status.HTTP_201_CREATED)
async def create_prescription(
    payload: PrescriptionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor")),
):
    # Validate patient
    result = await db.execute(select(User).where(User.id == payload.patient_id))
    patient = result.scalar_one_or_none()
    if not patient or patient.role.value != "patient":
        raise HTTPException(status_code=404, detail="Patient not found")

    prescription = Prescription(
        patient_id=payload.patient_id,
        doctor_id=current_user.id,
        medication_details=payload.medication_details,
        raw_text=payload.raw_text,
        is_uploaded_image=False,
    )
    db.add(prescription)
    await db.commit()
    await db.refresh(prescription)
    return prescription


# ─── List prescriptions ───────────────────────────────────────────────────────

@router.get("/", response_model=List[PrescriptionOut])
async def list_prescriptions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role.value == "patient":
        condition = Prescription.patient_id == current_user.id
    else:
        condition = Prescription.doctor_id == current_user.id

    result = await db.execute(
        select(Prescription).where(condition).order_by(Prescription.created_at.desc())
    )
    return result.scalars().all()


# ─── Get single prescription ──────────────────────────────────────────────────

@router.get("/{prescription_id}", response_model=PrescriptionOut)
async def get_prescription(
    prescription_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Prescription).where(Prescription.id == prescription_id)
    )
    rx = result.scalar_one_or_none()
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")

    if rx.patient_id != current_user.id and rx.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return rx
