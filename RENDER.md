# Deploy DeepGuard on Render

DeepGuard is configured for [Render](https://render.com) via `render.yaml` (Blueprint).

## Prerequisites

- A [Render account](https://dashboard.render.com/register)
- A GitHub/GitLab repo containing this project
- **Pro plan ($85/mo)** — the GenD CLIP-L/14 model needs ~4 GB RAM on CPU (Standard 2 GB will OOM)

## Deploy in 3 steps

### 1. Push to GitHub

```bash
cd /home/ishaan/deepfake
git init
git add .
git commit -m "Add DeepGuard deepfake detection with Render config"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/deepguard.git
git push -u origin main
```

### 2. Create Blueprint on Render

1. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
2. Connect your GitHub account and select the `deepguard` repository
3. Render detects `render.yaml` automatically
4. Click **Apply**

### 3. Wait for deploy

- **Build:** ~10–15 min (PyTorch + frontend)
- **First model download:** ~5–10 min after deploy (GenD + CLIP weights cached on persistent disk)
- Check logs in the Render dashboard until you see `Model loaded successfully`

Your app will be live at: `https://deepguard.onrender.com` (or similar)

## Verify

```bash
curl https://YOUR-SERVICE.onrender.com/api/health
curl -X POST https://YOUR-SERVICE.onrender.com/api/detect/image \
  -F "file=@test_images/fake_faceforensics_01.png"
```

## Configuration (`render.yaml`)

| Setting | Value |
|---------|-------|
| Plan | `pro` (4 GB RAM) |
| Runtime | Docker (`Dockerfile.render`) |
| Health check | `/api/health` |
| Persistent disk | 10 GB at `/app/.cache/huggingface` (model cache) |
| Region | Oregon |

## Cost-saving alternative

To reduce cost, switch `plan: pro` → `plan: standard` in `render.yaml`, but the model may run out of memory. A lighter model would be needed for Standard/Starter tiers.

## Notes

- **No GPU on Render** — inference runs on CPU (~5–15 s per image)
- **Cold starts:** Free/starter spin-down doesn't apply on Pro; model stays cached on disk
- **503 errors:** If you hit the API before the model finishes loading, wait a few minutes and retry
