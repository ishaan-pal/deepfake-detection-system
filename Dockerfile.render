FROM node:22-alpine AS frontend-build

WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build && test -f /build/backend/static/index.html

FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements-cpu.txt .
RUN pip install --no-cache-dir torch==2.6.0 torchvision==0.21.0 \
    --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements-cpu.txt

COPY backend/app ./app
COPY --from=frontend-build /build/backend/static ./static
COPY scripts/start-render.sh ./start-render.sh
RUN chmod +x ./start-render.sh && test -f ./static/index.html

ENV HF_HOME=/app/.cache/huggingface
ENV TRANSFORMERS_CACHE=/app/.cache/huggingface
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["./start-render.sh"]
