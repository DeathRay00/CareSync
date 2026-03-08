from typing import List
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user, require_role
from app.database import get_db
from app.models import Appointment, AppointmentStatus, User
from app.schemas import AppointmentCreate, AppointmentOut, AppointmentUpdate

router = APIRouter(prefix="/api/appointments", tags=["Appointments"])


@router.post("/", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    payload: AppointmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("patient")),
):
    # Validate doctor exists and has doctor role
    result = await db.execute(select(User).where(User.id == payload.doctor_id))
    doctor = result.scalar_one_or_none()
    if not doctor or doctor.role.value != "doctor":
        raise HTTPException(status_code=404, detail="Doctor not found")

    appt = Appointment(
        patient_id=current_user.id,
        doctor_id=payload.doctor_id,
        datetime=payload.datetime,
        notes=payload.notes,
    )
    db.add(appt)
    await db.commit()
    await db.refresh(appt)

    # Reload with relationships
    result = await db.execute(
        select(Appointment)
        .options(selectinload(Appointment.patient), selectinload(Appointment.doctor))
        .where(Appointment.id == appt.id)
    )
    return result.scalar_one()


@router.get("/", response_model=List[AppointmentOut])
async def list_appointments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role.value == "patient":
        condition = Appointment.patient_id == current_user.id
    else:
        condition = Appointment.doctor_id == current_user.id

    result = await db.execute(
        select(Appointment)
        .options(selectinload(Appointment.patient), selectinload(Appointment.doctor))
        .where(condition)
        .order_by(Appointment.datetime)
    )
    return result.scalars().all()


@router.get("/{appointment_id}", response_model=AppointmentOut)
async def get_appointment(
    appointment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Appointment)
        .options(selectinload(Appointment.patient), selectinload(Appointment.doctor))
        .where(Appointment.id == appointment_id)
    )
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Authorization: only involved parties
    if appt.patient_id != current_user.id and appt.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return appt


@router.patch("/{appointment_id}", response_model=AppointmentOut)
async def update_appointment(
    appointment_id: uuid.UUID,
    payload: AppointmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Appointment)
        .options(selectinload(Appointment.patient), selectinload(Appointment.doctor))
        .where(Appointment.id == appointment_id)
    )
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if appt.patient_id != current_user.id and appt.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    if payload.status is not None:
        appt.status = payload.status
    if payload.datetime is not None:
        appt.datetime = payload.datetime
    if payload.notes is not None:
        appt.notes = payload.notes

    await db.commit()
    await db.refresh(appt)
    return appt


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_appointment(
    appointment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Appointment).where(Appointment.id == appointment_id)
    )
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if appt.patient_id != current_user.id and appt.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    appt.status = AppointmentStatus.cancelled
    await db.commit()
