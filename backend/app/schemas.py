from __future__ import annotations
import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, EmailStr

from app.models import AppointmentStatus, SourceType, UserRole


# ─── Token ────────────────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[uuid.UUID] = None


# ─── User ─────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole


class UserOut(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    role: UserRole
    created_at: datetime

    model_config = {"from_attributes": True}


class UserLogin(BaseModel):
    email: EmailStr
    password: str


# ─── Appointment ──────────────────────────────────────────────────────────────

class AppointmentCreate(BaseModel):
    doctor_id: uuid.UUID
    datetime: datetime
    notes: Optional[str] = None


class AppointmentUpdate(BaseModel):
    status: Optional[AppointmentStatus] = None
    datetime: Optional[datetime] = None
    notes: Optional[str] = None


class AppointmentOut(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    datetime: datetime
    status: AppointmentStatus
    notes: Optional[str]
    created_at: datetime
    patient: Optional[UserOut] = None
    doctor: Optional[UserOut] = None

    model_config = {"from_attributes": True}


# ─── Prescription ─────────────────────────────────────────────────────────────

class PrescriptionCreate(BaseModel):
    patient_id: uuid.UUID
    medication_details: Any
    raw_text: Optional[str] = None


class PrescriptionOut(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    doctor_id: Optional[uuid.UUID]
    medication_details: Any
    raw_text: Optional[str]
    is_uploaded_image: bool
    image_url: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── MedicalReport ────────────────────────────────────────────────────────────

class MedicalReportOut(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    file_url: str
    original_filename: Optional[str]
    ai_analysis_summary: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Chat ─────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str
    context_used: list[str] = []


# ─── Generic ──────────────────────────────────────────────────────────────────

class MessageResponse(BaseModel):
    message: str
