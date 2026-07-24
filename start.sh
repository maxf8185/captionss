#!/bin/bash
echo "Starting Automatic Subtitle Generator..."

# Trap SIGINT to kill background processes on exit
trap 'kill 0' SIGINT

echo "Starting backend..."
cd backend || exit
if [ -d "venv" ]; then
    venv/bin/python -m uvicorn main:app --reload --port 8000 &
else
    python3 -m uvicorn main:app --reload --port 8000 &
fi
cd ..

echo "Starting frontend..."
cd frontend || exit
npm run dev &
cd ..

echo "Both servers are starting!"
echo "Backend API will be available at http://localhost:8000"
echo "Frontend UI will be available at http://localhost:3000"
echo "Press Ctrl+C to stop both servers."

wait
