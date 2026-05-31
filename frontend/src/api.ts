import type { DetectionResult, HealthStatus, VideoDetectionResult } from "./types";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error("Health check failed");
  return res.json();
}

export async function detectImage(file: File): Promise<DetectionResult> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_BASE}/api/detect/image`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Detection failed" }));
    throw new Error(typeof err.detail === "string" ? err.detail : "Detection failed");
  }

  return res.json();
}

export async function detectVideo(file: File): Promise<VideoDetectionResult> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_BASE}/api/detect/video`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Detection failed" }));
    throw new Error(typeof err.detail === "string" ? err.detail : "Detection failed");
  }

  return res.json();
}
