import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  FileVideo,
  ImageIcon,
  Loader2,
  Scan,
  Shield,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { detectImage, detectVideo, fetchHealth } from "./api";
import type { DetectionResult, HealthStatus, ScanHistoryItem, VideoDetectionResult } from "./types";

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function VerdictBadge({ label, confidence }: { label: string; confidence: number }) {
  const isFake = label === "fake";
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
        isFake
          ? "bg-accent-rose/15 text-accent-rose ring-1 ring-accent-rose/30"
          : "bg-accent-emerald/15 text-accent-emerald ring-1 ring-accent-emerald/30"
      }`}
    >
      {isFake ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
      {isFake ? "Likely Deepfake" : "Likely Authentic"}
      <span className="opacity-80">· {formatPercent(confidence)}</span>
    </div>
  );
}

function ProbabilityBar({ real, fake }: { real: number; fake: number }) {
  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1 flex justify-between text-xs uppercase tracking-wider text-slate-400">
          <span>Authentic</span>
          <span>{formatPercent(real)}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-ink-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-emerald to-emerald-400 transition-all duration-700"
            style={{ width: `${real * 100}%` }}
          />
        </div>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-xs uppercase tracking-wider text-slate-400">
          <span>Deepfake</span>
          <span>{formatPercent(fake)}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-ink-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-rose to-rose-400 transition-all duration-700"
            style={{ width: `${fake * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function FrameTimeline({ frames }: { frames: VideoDetectionResult["frame_results"] }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Frame Analysis</h4>
      <div className="grid max-h-48 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-8">
        {frames.map((frame) => (
          <div
            key={frame.frame_index}
            title={`${frame.timestamp_seconds}s — ${frame.label}`}
            className={`rounded-lg p-2 text-center text-[10px] ring-1 ${
              frame.label === "fake"
                ? "bg-accent-rose/10 ring-accent-rose/20 text-accent-rose"
                : "bg-accent-emerald/10 ring-accent-emerald/20 text-accent-emerald"
            }`}
          >
            <div className="font-mono">{frame.timestamp_seconds}s</div>
            <div className="mt-1 font-semibold uppercase">{frame.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; type: "image" | "video"; name: string } | null>(null);
  const [result, setResult] = useState<DetectionResult | VideoDetectionResult | null>(null);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFileRef = useRef<File | null>(null);

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const resetPreview = useCallback(() => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setResult(null);
    setError(null);
    pendingFileRef.current = null;
  }, [preview]);

  const runDetection = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setResult(null);

    const isVideo = file.type.startsWith("video/");
    const previewUrl = URL.createObjectURL(file);
    setPreview({ url: previewUrl, type: isVideo ? "video" : "image", name: file.name });

    try {
      const detection = isVideo ? await detectVideo(file) : await detectImage(file);
      setResult(detection);
      setHistory((prev) => [
        {
          id: crypto.randomUUID(),
          filename: file.name,
          mediaType: isVideo ? "video" : "image",
          result: detection,
          previewUrl,
          timestamp: new Date(),
        },
        ...prev.slice(0, 9),
      ]);
    } catch (err) {
      URL.revokeObjectURL(previewUrl);
      setPreview(null);
      setError(err instanceof Error ? err.message : "Detection failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return;
      const file = files[0];
      pendingFileRef.current = file;
      void runDetection(file);
    },
    [runDetection],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const videoResult = result && "frame_results" in result ? result : null;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
      <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-accent-cyan/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-accent-violet/10 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-cyan/20 to-accent-violet/20 ring-1 ring-white/10">
              <Shield className="h-6 w-6 text-accent-cyan" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                <span className="gradient-text">DeepGuard</span>
              </h1>
              <p className="text-sm text-slate-400">AI deepfake detection powered by GenD CLIP-L/14</p>
            </div>
          </div>

          {health && (
            <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3 text-sm">
              <Cpu className="h-4 w-4 text-accent-cyan" />
              <div>
                <div className="font-medium text-slate-200">
                  {health.model_loaded ? "Model Ready" : "Model Loading..."}
                </div>
                <div className="text-xs text-slate-500">{health.device}</div>
              </div>
              <span
                className={`ml-2 h-2 w-2 rounded-full ${health.model_loaded ? "bg-accent-emerald" : "bg-amber-400 animate-pulse"}`}
              />
            </div>
          )}
        </header>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <section className="glass rounded-3xl p-6 sm:p-8">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Scan className="h-5 w-5 text-accent-violet" />
                  Analyze Media
                </h2>
                {(preview || result) && (
                  <button
                    onClick={resetPreview}
                    className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-slate-400 transition hover:bg-white/5 hover:text-white"
                  >
                    <X className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`group relative cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${
                  dragging
                    ? "border-accent-cyan bg-accent-cyan/5"
                    : "border-white/10 hover:border-accent-violet/40 hover:bg-white/[0.02]"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />

                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-cyan/10 to-accent-violet/10 ring-1 ring-white/10 transition group-hover:scale-105">
                  <Upload className="h-7 w-7 text-accent-cyan" />
                </div>
                <p className="text-base font-medium text-slate-200">Drop an image or video here</p>
                <p className="mt-2 text-sm text-slate-500">or click to browse · JPEG, PNG, WebP, MP4, WebM</p>
              </div>

              {loading && (
                <div className="mt-6 flex items-center justify-center gap-3 rounded-2xl bg-ink-800/50 py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-accent-cyan" />
                  <span className="text-slate-300">Running deepfake analysis...</span>
                </div>
              )}

              {error && (
                <div className="mt-6 flex items-start gap-3 rounded-2xl border border-accent-rose/20 bg-accent-rose/10 p-4 text-sm text-accent-rose">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {preview && !loading && (
                <div className="mt-6 overflow-hidden rounded-2xl ring-1 ring-white/10">
                  {preview.type === "image" ? (
                    <img src={preview.url} alt={preview.name} className="max-h-80 w-full object-contain bg-ink-900" />
                  ) : (
                    <video src={preview.url} controls className="max-h-80 w-full bg-ink-900" />
                  )}
                  <div className="border-t border-white/5 bg-ink-900/80 px-4 py-2 text-xs text-slate-500">
                    {preview.name}
                  </div>
                </div>
              )}
            </section>

            {result && (
              <section className="glass animate-in fade-in rounded-3xl p-6 sm:p-8">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <h2 className="text-lg font-semibold">Detection Results</h2>
                  <VerdictBadge label={result.label} confidence={result.confidence} />
                </div>

                <ProbabilityBar real={result.probabilities.real} fake={result.probabilities.fake} />

                {videoResult && (
                  <div className="mt-6 border-t border-white/5 pt-6">
                    <p className="mb-4 text-sm text-slate-400">
                      Analyzed {videoResult.frames_analyzed} frames across the video timeline
                    </p>
                    <FrameTimeline frames={videoResult.frame_results} />
                  </div>
                )}

                <div className="mt-6 rounded-xl bg-ink-900/60 p-4 text-xs text-slate-500">
                  Model: <span className="font-mono text-slate-400">{result.model}</span>
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-6 lg:col-span-2">
            <section className="glass rounded-3xl p-6">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">How it works</h3>
              <ul className="space-y-4 text-sm text-slate-300">
                <li className="flex gap-3">
                  <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent-cyan" />
                  <span>
                    <strong className="text-white">Images</strong> are analyzed with GenD, a WACV 2026 model that
                    generalizes across deepfake benchmarks.
                  </span>
                </li>
                <li className="flex gap-3">
                  <FileVideo className="mt-0.5 h-4 w-4 shrink-0 text-accent-violet" />
                  <span>
                    <strong className="text-white">Videos</strong> are sampled frame-by-frame; scores are aggregated
                    for a final verdict.
                  </span>
                </li>
                <li className="flex gap-3">
                  <Shield className="mt-0.5 h-4 w-4 shrink-0 text-accent-emerald" />
                  <span>
                    Built on <strong className="text-white">CLIP ViT-L/14</strong> with parameter-efficient
                    fine-tuning for robust cross-dataset detection.
                  </span>
                </li>
              </ul>
            </section>

            <section className="glass rounded-3xl p-6">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
                <Clock className="h-4 w-4" /> Recent Scans
              </h3>
              {history.length === 0 ? (
                <p className="text-sm text-slate-500">No scans yet. Upload media to get started.</p>
              ) : (
                <ul className="space-y-3">
                  {history.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 rounded-xl bg-ink-900/50 p-3 ring-1 ring-white/5"
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          item.result.label === "fake" ? "bg-accent-rose/10" : "bg-accent-emerald/10"
                        }`}
                      >
                        {item.mediaType === "video" ? (
                          <FileVideo
                            className={`h-4 w-4 ${item.result.label === "fake" ? "text-accent-rose" : "text-accent-emerald"}`}
                          />
                        ) : (
                          <ImageIcon
                            className={`h-4 w-4 ${item.result.label === "fake" ? "text-accent-rose" : "text-accent-emerald"}`}
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-200">{item.filename}</div>
                        <div className="text-xs text-slate-500">
                          {item.result.label.toUpperCase()} · {formatPercent(item.result.confidence)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>

        <footer className="mt-12 text-center text-xs text-slate-600">
          DeepGuard · Research-grade detection · Results are probabilistic — use as one signal among many
        </footer>
      </div>
    </div>
  );
}
