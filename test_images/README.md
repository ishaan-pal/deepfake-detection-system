# Test Images

Sample images for testing DeepGuard deepfake detection.

| File | Expected label | Description |
|------|----------------|-------------|
| `fake_faceforensics_01.png` | **Fake** | Known deepfake from FaceForensics++ |
| `real_faceforensics_01.png` | **Real** | Known authentic face from FaceForensics++ |
| `real_random_photo.jpg` | **Real** | Random real photo (not a face deepfake benchmark) |

## Test via the web UI

1. Open **http://localhost:8080**
2. Drag and drop any image from this folder onto the upload area

## Test via the API

From the project root:

```bash
# Fake image (expect: fake, ~97% confidence)
curl -X POST http://localhost:8080/api/detect/image \
  -F "file=@test_images/fake_faceforensics_01.png"

# Real image (expect: real, ~68% confidence)
curl -X POST http://localhost:8080/api/detect/image \
  -F "file=@test_images/real_faceforensics_01.png"

# Random real photo (expect: real, ~77% confidence)
curl -X POST http://localhost:8080/api/detect/image \
  -F "file=@test_images/real_random_photo.jpg"
```

## Run all tests at once

```bash
./test_images/run_tests.sh
```
