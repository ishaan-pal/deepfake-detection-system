export interface Probabilities {
  real: number;
  fake: number;
}

export interface DetectionResult {
  label: "real" | "fake";
  confidence: number;
  probabilities: Probabilities;
  model: string;
  media_type: string;
}

export interface FrameResult {
  frame_index: number;
  timestamp_seconds: number;
  label: "real" | "fake";
  confidence: number;
  probabilities: Probabilities;
}

export interface VideoDetectionResult extends DetectionResult {
  frames_analyzed: number;
  total_frames?: number;
  frame_results: FrameResult[];
}

export interface HealthStatus {
  status: string;
  model_loaded: boolean;
  model_id: string;
  device: string;
}

export interface ScanHistoryItem {
  id: string;
  filename: string;
  mediaType: "image" | "video";
  result: DetectionResult | VideoDetectionResult;
  previewUrl?: string;
  timestamp: Date;
}
