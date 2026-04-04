@echo off
echo Starting Medical Assistant App...

:: Start Backend (FastAPI)
start "SumitraRaj Hospital - Backend" cmd /k "cd /d "%~dp0backend" && .\venv\Scripts\uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

:: Wait a moment for backend to initialize
timeout /t 2 /nobreak >nul

:: Start Frontend (Next.js)
start "SumitraRaj Hospital - Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Both servers are starting in separate windows.
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:3000
echo   API Docs: http://localhost:8000/docs
echo.
pause
