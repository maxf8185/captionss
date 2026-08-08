@echo off
echo Building Next.js Frontend...
cd frontend
call npm run build
cd ..

echo.
echo Starting Unified Web Server on port 8000...
cd backend
start cmd /k ".\venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000"
cd ..

echo.
echo Server is running! 
echo You can access it locally at: http://localhost:8000
echo.
echo To share it via Ngrok, open a new terminal and run:
echo ngrok http 8000
pause
