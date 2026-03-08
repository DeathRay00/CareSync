from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import init_db
from app.routers import auth, appointments, users, prescriptions, reports, chat
import os


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize DB tables and pgvector extension on startup."""
    await init_db()
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    yield


app = FastAPI(
    title="MedAssistant API",
    description="AI-powered Medical Assistant — Role-based patient & doctor portal",
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
_origins = [o.strip() for o in settings.FRONTEND_URL.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_origin_regex=r"https://.*\.devtunnels\.ms",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Static file serving for uploads ──────────────────────────────────────────
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(appointments.router)
app.include_router(prescriptions.router)
app.include_router(reports.router)
app.include_router(chat.router)


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "MedAssistant API"}
