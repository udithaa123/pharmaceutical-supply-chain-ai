#!/bin/bash

echo "Stopping old uvicorn processes..."
pkill -f uvicorn || true

echo "Starting backend..."
cd backend || cd .
source venv_new/bin/activate || source ../venv_new/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8020 --workers 4 &

echo "Starting frontend..."
cd frontend || cd ../frontend
npm run dev
