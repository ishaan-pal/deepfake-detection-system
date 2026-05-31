#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "==> Setting up Python backend..."
python3 -m venv .venv
source .venv/bin/activate
pip install -q --upgrade pip
pip install -q -r backend/requirements.txt

echo "==> Building frontend..."
cd frontend
npm install --silent
npm run build
cd "$ROOT"

echo "==> Preloading model (first run downloads ~1.5GB)..."
cd backend
PYTHONPATH=. python -c "from app.detector import DeepfakeDetector; DeepfakeDetector().load()"
echo "==> Starting DeepGuard on http://localhost:8000 (use docker compose for port 8080)"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
