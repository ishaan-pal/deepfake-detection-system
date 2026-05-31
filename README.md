# DeepGuard — Deepfake Detection System

AI-powered deepfake detection using **GenD (CLIP ViT-L/14)**, the state-of-the-art model from the WACV 2026 paper [*Deepfake Detection that Generalizes Across Benchmarks*](https://huggingface.co/yermandy/GenD_CLIP_L_14).

## Features

- **Image detection** — Upload JPEG, PNG, or WebP images for instant analysis
- **Video detection** — Sample frames from MP4/WebM/MOV and aggregate scores
- **Modern web UI** — Drag-and-drop interface with confidence visualization
- **REST API** — FastAPI backend with OpenAPI docs at `/docs`
- **Docker ready** — Single-container deployment with model caching

## Quick Start

```bash
chmod +x start.sh
./start.sh
```

Open **http://localhost:8080** in your browser.

> First run downloads ~1.5 GB of model weights (GenD + CLIP ViT-L/14). CPU inference works but is slower; GPU is used automatically when available.

## Docker Deployment

Enable WSL integration in Docker Desktop, then:

```bash
docker compose up --build
```

**No GPU?** Use the CPU-only compose file instead:

```bash
docker compose -f docker-compose.cpu.yml up --build -d
```

The app will be available at **http://localhost:8080**.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Service health and model status |
| POST | `/api/detect/image` | Analyze an image (multipart `file`) |
| POST | `/api/detect/video` | Analyze a video (multipart `file`) |

### Example

```bash
curl -X POST http://localhost:8080/api/detect/image \
  -F "file=@photo.jpg"
```

## Development

**Backend only:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend dev server (proxies API to :8000):**
```bash
cd frontend
npm install
npm run dev
```

## Model

- **Model:** [yermandy/GenD_CLIP_L_14](https://huggingface.co/yermandy/GenD_CLIP_L_14)
- **Architecture:** CLIP ViT-L/14 encoder + linear probe (parameter-efficient fine-tuning)
- **Performance:** State-of-the-art cross-dataset generalization on 14 benchmark datasets

## Disclaimer

Detection results are probabilistic estimates. Use DeepGuard as one signal among many — not as sole evidence for authentication or legal decisions.
