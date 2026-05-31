from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_id: str
    device: str


class Probabilities(BaseModel):
    real: float
    fake: float


class DetectionResponse(BaseModel):
    label: str
    confidence: float = Field(ge=0.0, le=1.0)
    probabilities: Probabilities
    model: str
    media_type: str


class FrameResult(BaseModel):
    frame_index: int
    timestamp_seconds: float
    label: str
    confidence: float
    probabilities: Probabilities


class VideoDetectionResponse(DetectionResponse):
    frames_analyzed: int
    total_frames: int | None = None
    frame_results: list[FrameResult]
