from __future__ import annotations

import io
import logging
import threading
from dataclasses import dataclass
from typing import Literal

import cv2
import numpy as np
import torch
from PIL import Image

from app.modeling_gend import GenD

logger = logging.getLogger(__name__)

MODEL_ID = "yermandy/GenD_CLIP_L_14"
LABELS = ("real", "fake")


@dataclass
class DetectionResult:
    label: Literal["real", "fake"]
    confidence: float
    probabilities: dict[str, float]
    model: str


class DeepfakeDetector:
    def __init__(self) -> None:
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model_id = MODEL_ID
        self._model: GenD | None = None
        self._load_lock = threading.Lock()
        self._loading = False
        self.load_error: str | None = None

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    @property
    def is_loading(self) -> bool:
        return self._loading

    def start_background_load(self) -> None:
        with self._load_lock:
            if self._model is not None or self._loading:
                return
            self._loading = True

        thread = threading.Thread(target=self._background_load, daemon=True)
        thread.start()

    def _background_load(self) -> None:
        try:
            self.load()
        except Exception as exc:
            logger.exception("Background model load failed")
            self.load_error = str(exc)
        finally:
            self._loading = False

    def load(self) -> None:
        if self._model is not None:
            return

        with self._load_lock:
            if self._model is not None:
                return

            logger.info("Loading GenD model (%s) on %s...", self.model_id, self.device)
            self._model = GenD.from_pretrained(self.model_id)
            self._model.eval()
            self._model.to(self.device)
            logger.info("Model loaded successfully.")

    def ensure_ready(self) -> None:
        if self.load_error:
            raise RuntimeError(f"Model failed to load: {self.load_error}")
        if not self.is_loaded:
            raise RuntimeError("Model is still loading. Please retry in a few minutes.")

    def _predict_tensor(self, tensor: torch.Tensor) -> DetectionResult:
        assert self._model is not None

        tensor = tensor.unsqueeze(0).to(self.device)
        with torch.no_grad():
            logits = self._model(tensor)
            probs = torch.softmax(logits, dim=-1).squeeze(0).cpu().tolist()

        probabilities = {LABELS[i]: round(probs[i], 4) for i in range(len(LABELS))}
        label_idx = int(np.argmax(probs))
        label = LABELS[label_idx]
        confidence = probabilities[label]

        return DetectionResult(
            label=label,
            confidence=confidence,
            probabilities=probabilities,
            model=self.model_id,
        )

    def predict_image_bytes(self, data: bytes) -> DetectionResult:
        self.ensure_ready()
        assert self._model is not None

        image = Image.open(io.BytesIO(data)).convert("RGB")
        tensor = self._model.feature_extractor.preprocess(image)
        return self._predict_tensor(tensor)

    def predict_video_bytes(
        self,
        data: bytes,
        max_frames: int = 16,
        sample_stride: int = 5,
    ) -> tuple[DetectionResult, list[dict]]:
        self.ensure_ready()
        assert self._model is not None

        tmp_path = "/tmp/deepfake_upload.mp4"
        with open(tmp_path, "wb") as f:
            f.write(data)

        cap = cv2.VideoCapture(tmp_path)
        if not cap.isOpened():
            raise ValueError("Unable to read video file.")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 0
        fps = float(cap.get(cv2.CAP_PROP_FPS)) or 24.0
        frame_idx = 0
        collected: list[tuple[int, DetectionResult]] = []

        while len(collected) < max_frames:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % sample_stride == 0:
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_image = Image.fromarray(rgb)
                tensor = self._model.feature_extractor.preprocess(pil_image)
                result = self._predict_tensor(tensor)
                collected.append((frame_idx, result))

            frame_idx += 1

        cap.release()

        if not collected:
            raise ValueError("No frames could be extracted from the video.")

        fake_scores = [r.probabilities["fake"] for _, r in collected]
        real_scores = [r.probabilities["real"] for _, r in collected]
        avg_fake = float(np.mean(fake_scores))
        avg_real = float(np.mean(real_scores))

        label: Literal["real", "fake"] = "fake" if avg_fake >= avg_real else "real"
        confidence = avg_fake if label == "fake" else avg_real

        aggregate = DetectionResult(
            label=label,
            confidence=round(confidence, 4),
            probabilities={"real": round(avg_real, 4), "fake": round(avg_fake, 4)},
            model=self.model_id,
        )

        frame_results = [
            {
                "frame_index": idx,
                "timestamp_seconds": round(idx / fps, 2),
                "label": result.label,
                "confidence": result.confidence,
                "probabilities": result.probabilities,
            }
            for idx, result in collected
        ]

        return aggregate, frame_results
