# SumitraRaj Hospital — AI-Powered Medical Web Application

A full-stack, role-based medical assistant with AI-driven features powered by **Google Gemini**.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Docker Compose                     │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  Next.js 16  │  │   FastAPI    │  │ PostgreSQL  │ │
│  │  (Port 3000) │→ │  (Port 8000) │→ │ + pgvector │ │
│  │  Tailwind    │  │  SQLAlchemy  │  │ (Port 5432) │ │
│  │  shadcn/ui   │  │  Gemini AI   │  │            │ │
│  └──────────────┘  └──────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Python 3.13, FastAPI, SQLAlchemy (async) |
| Database | PostgreSQL 17 + pgvector extension |
| AI/LLM | Google Gemini 1.5 Flash (multimodal + text) |
| Auth | JWT (python-jose + bcrypt) |
| State | Zustand (frontend) |

## Features

### Patient Portal
- 📅 Book / cancel appointments with available doctors
- 💊 Upload handwritten prescription images → **Gemini OCR** extracts medicines & dosages
- 📄 Upload medical reports (PDF/image) → **Gemini analyzes** and summarizes findings
- 🤖 **RAG-powered AI Chatbot** — context-aware answers from your medical history

### Doctor Portal
- 📋 View today's schedule and all appointments
- ✅ Confirm / complete / cancel patient appointment requests
- 👥 Browse patient directory
- ✍️ Write digital prescriptions directly to patient profiles

---

## 🚀 Setup on a New Device (Docker)

> **Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) must be installed.

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd "<repo-folder>"
```

### 2. Create your `.env` file

```bash
cp .env.example .env
```

Open `.env` and fill in:

```env
# Required — get from https://aistudio.google.com/
GEMINI_API_KEY=your-gemini-api-key-here

# Change this to a long random string in production
SECRET_KEY=change-this-to-a-long-random-secret-key

# URL the browser uses to reach the backend
# On the same machine: http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:8000

# CORS origins (same as above, comma-separated if multiple)
FRONTEND_URL=http://localhost:3000
```

### 3. Build and start

```bash
docker compose up --build
```

First build takes a few minutes. Subsequent starts are fast.

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Swagger Docs | http://localhost:8000/docs |

### 4. Stop

```bash
docker compose down          # keep data
docker compose down -v       # also delete database volume
```

---

## 💻 Local Development (without Docker)

**Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt

# Copy env (edit GEMINI_API_KEY and DATABASE_URL)
cp ../.env.example .env

uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install

# Set the backend URL
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

npm run dev
```

**Database:** PostgreSQL 17 with pgvector must be running locally.
Set `DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/SumitraRaj Hospital` in `backend/.env`.

---

## Pushing to GitHub

```bash
git init                      # if not already a repo
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

> ⚠️ `.env`, `backend/.env`, and `frontend/.env.local` are in `.gitignore` and will **not** be pushed.
> Share secrets with teammates via a secure channel (e.g. 1Password, GitHub Secrets).

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login (returns JWT) |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/appointments/` | List appointments |
| POST | `/api/appointments/` | Book appointment (patient) |
| PATCH | `/api/appointments/{id}` | Update status (doctor) |
| POST | `/api/prescriptions/upload-image` | Upload Rx image → Gemini OCR |
| POST | `/api/prescriptions/` | Write prescription (doctor) |
| POST | `/api/reports/upload` | Upload + analyze report |
| POST | `/api/chat/` | RAG chatbot query |
| GET | `/api/users/doctors` | List all doctors |
| GET | `/api/users/patients` | List all patients (doctor only) |

## Project Structure

```
Mini Project Ketki/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env
│   └── app/
│       ├── main.py          # FastAPI app + lifespan
│       ├── config.py        # Pydantic settings
│       ├── database.py      # Async SQLAlchemy engine
│       ├── models.py        # SQLAlchemy ORM models
│       ├── schemas.py       # Pydantic request/response schemas
│       ├── auth.py          # JWT utils + dependencies
│       ├── services/
│       │   └── gemini_service.py  # All Gemini AI logic
│       └── routers/
│           ├── auth.py
│           ├── users.py
│           ├── appointments.py
│           ├── prescriptions.py
│           ├── reports.py
│           └── chat.py
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── tailwind.config.js
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx            # Landing page
        │   ├── auth/login/         # Login page
        │   ├── auth/register/      # Registration page
        │   ├── patient/            # Patient portal
        │   │   ├── dashboard/
        │   │   ├── appointments/
        │   │   ├── prescriptions/
        │   │   ├── reports/
        │   │   └── chat/
        │   └── doctor/             # Doctor portal
        │       ├── dashboard/
        │       ├── appointments/
        │       ├── patients/
        │       └── prescriptions/
        ├── components/
        │   └── Sidebar.tsx
        ├── store/
        │   └── authStore.ts        # Zustand auth state
        └── lib/
            ├── api.ts              # Axios client with JWT
            └── utils.ts
```

## Execution Phases

- ✅ **Phase 1** — FastAPI backend, PostgreSQL + pgvector, DB models  
- ✅ **Phase 2** — JWT Auth + CRUD endpoints for Appointments & Users  
- ✅ **Phase 3** — Gemini integration (Prescription OCR + Report Analysis)  
- ✅ **Phase 4** — RAG pipeline (embeddings + vector search + chatbot)  
- ✅ **Phase 5** — Next.js frontend with Tailwind/shadcn layouts  
- ✅ **Phase 6** — Frontend connected to backend APIs  

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL async connection string |
| `SECRET_KEY` | JWT signing secret (change in production!) |
| `GEMINI_API_KEY` | Google Gemini API key |
| `FRONTEND_URL` | CORS allowed origin |
| `NEXT_PUBLIC_API_URL` | Backend URL for the frontend |
