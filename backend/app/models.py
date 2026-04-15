import uuid
import enum
from datetime import datetime

from sqlalchemy import (
    Column, String, Boolean, DateTime, ForeignKey,
    Enum as SAEnum, Text, JSON, func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector

from app.database import Base


# ─── Enums ────────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    patient = "patient"
    doctor = "doctor"


class AppointmentStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    completed = "completed"
    cancelled = "cancelled"


class SourceType(str, enum.Enum):
    report = "report"
    prescription = "prescription"


# ─── User ─────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    patient_appointments = relationship(
        "Appointment", foreign_keys="Appointment.patient_id", back_populates="patient"
    )
    doctor_appointments = relationship(
        "Appointment", foreign_keys="Appointment.doctor_id", back_populates="doctor"
    )
    prescriptions_received = relationship(
        "Prescription", foreign_keys="Prescription.patient_id", back_populates="patient"
    )
    prescriptions_written = relationship(
        "Prescription", foreign_keys="Prescription.doctor_id", back_populates="doctor"
    )
    medical_reports = relationship("MedicalReport", back_populates="patient")
    embeddings = relationship("DocumentEmbedding", back_populates="patient")


# ─── Appointment ──────────────────────────────────────────────────────────────

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    datetime = Column(DateTime(timezone=True), nullable=False)
    status = Column(SAEnum(AppointmentStatus), default=AppointmentStatus.pending, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    patient = relationship("User", foreign_keys=[patient_id], back_populates="patient_appointments")
    doctor = relationship("User", foreign_keys=[doctor_id], back_populates="doctor_appointments")


# ─── Prescription ─────────────────────────────────────────────────────────────

class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    medication_details = Column(JSON, nullable=True)   # structured JSON from Gemini or doctor
    raw_text = Column(Text, nullable=True)             # raw OCR text
    is_uploaded_image = Column(Boolean, default=False, nullable=False)
    image_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    patient = relationship("User", foreign_keys=[patient_id], back_populates="prescriptions_received")
    doctor = relationship("User", foreign_keys=[doctor_id], back_populates="prescriptions_written")


# ─── MedicalReport ────────────────────────────────────────────────────────────

class MedicalReport(Base):
    __tablename__ = "medical_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    file_url = Column(String(500), nullable=False)
    original_filename = Column(String(500), nullable=True)
    ai_analysis_summary = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    patient = relationship("User", back_populates="medical_reports")
    embeddings = relationship("DocumentEmbedding", back_populates="report")


# ─── DocumentEmbedding ────────────────────────────────────────────────────────

class DocumentEmbedding(Base):
    __tablename__ = "document_embeddings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    report_id = Column(UUID(as_uuid=True), ForeignKey("medical_reports.id"), nullable=True)
    source_type = Column(SAEnum(SourceType), nullable=False)
    content_text = Column(Text, nullable=False)
    # 1024-dimensional embedding (Mistral-embed)
    embedding = Column(Vector(1024), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    patient = relationship("User", back_populates="embeddings")
    report = relationship("MedicalReport", back_populates="embeddings")
