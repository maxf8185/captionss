@echo off
echo Starting Automatic Subtitle Generator...

:: Start the Python backend
echo Starting backend...
cd backend
start cmd /k ".\venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000"
cd ..

:: Start the Next.js frontend
echo Starting frontend...
cd frontend
start cmd /k "npm run dev"
cd ..

echo Both servers are starting!
echo Backend API will be available at http://localhost:8000
echo Frontend UI will be available at http://localhost:3000
pause
