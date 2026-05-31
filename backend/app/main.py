import logging
from contextlib import asynccontextmanager
from pathlib import Path

import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.detector import DeepfakeDetector
from app.schemas import (
    DetectionResponse,
    FrameResult,
    HealthResponse,
    Probabilities,
    VideoDetectionResponse,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

detector = DeepfakeDetector()
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/bmp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"}
MAX_IMAGE_BYTES = 20 * 1024 * 1024
MAX_VIDEO_BYTES = 100 * 1024 * 1024


@asynccontextmanager
async def lifespan(_: FastAPI):
    detector.start_background_load()
    yield


def _model_unavailable(exc: RuntimeError) -> HTTPException:
    status = 503 if "still loading" in str(exc).lower() else 500
    return HTTPException(status_code=status, detail=str(exc))


app = FastAPI(
    title="DeepGuard — Deepfake Detection API",
    description="State-of-the-art deepfake detection powered by GenD (CLIP ViT-L/14, WACV 2026)",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        model_loaded=detector.is_loaded,
        model_id=detector.model_id,
        device=str(detector.device),
    )


@app.post("/api/detect/image", response_model=DetectionResponse)
async def detect_image(file: UploadFile = File(...)) -> DetectionResponse:
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported image format. Use JPEG, PNG, or WebP.")

    data = await file.read()
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image exceeds 20 MB limit.")
    if not data:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")

    try:
        result = detector.predict_image_bytes(data)
    except RuntimeError as exc:
        raise _model_unavailable(exc) from exc
    except Exception as exc:
        logger.exception("Image detection failed")
        raise HTTPException(status_code=500, detail=f"Detection failed: {exc}") from exc

    return DetectionResponse(
        label=result.label,
        confidence=result.confidence,
        probabilities=Probabilities(**result.probabilities),
        model=result.model,
        media_type="image",
    )


@app.post("/api/detect/video", response_model=VideoDetectionResponse)
async def detect_video(file: UploadFile = File(...)) -> VideoDetectionResponse:
    if file.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported video format. Use MP4, WebM, or MOV.")

    data = await file.read()
    if len(data) > MAX_VIDEO_BYTES:
        raise HTTPException(status_code=400, detail="Video exceeds 100 MB limit.")
    if not data:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")

    try:
        aggregate, frame_results = detector.predict_video_bytes(data)
    except RuntimeError as exc:
        raise _model_unavailable(exc) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Video detection failed")
        raise HTTPException(status_code=500, detail=f"Detection failed: {exc}") from exc

    return VideoDetectionResponse(
        label=aggregate.label,
        confidence=aggregate.confidence,
        probabilities=Probabilities(**aggregate.probabilities),
        model=aggregate.model,
        media_type="video",
        frames_analyzed=len(frame_results),
        frame_results=[
            FrameResult(
                frame_index=f["frame_index"],
                timestamp_seconds=f["timestamp_seconds"],
                label=f["label"],
                confidence=f["confidence"],
                probabilities=Probabilities(**f["probabilities"]),
            )
            for f in frame_results
        ],
    )


if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")

        requested = STATIC_DIR / full_path
        if requested.is_file():
            return FileResponse(requested)

        index = STATIC_DIR / "index.html"
        if index.exists():
            return FileResponse(index)

        raise HTTPException(status_code=404, detail="Frontend not built.")
