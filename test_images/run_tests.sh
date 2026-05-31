#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API="${DEEPGUARD_API:-http://localhost:8080}"

echo "Testing DeepGuard at $API"
echo

for img in "$ROOT/test_images"/fake_*.png "$ROOT/test_images"/fake_*.jpg; do
  [ -f "$img" ] || continue
  echo "=== $(basename "$img") (expected: fake) ==="
  curl -s -X POST "$API/api/detect/image" -F "file=@$img" | python3 -m json.tool
  echo
done

for img in "$ROOT/test_images"/real_*.png "$ROOT/test_images"/real_*.jpg; do
  [ -f "$img" ] || continue
  echo "=== $(basename "$img") (expected: real) ==="
  curl -s -X POST "$API/api/detect/image" -F "file=@$img" | python3 -m json.tool
  echo
done
