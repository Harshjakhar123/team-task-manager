# syntax=docker/dockerfile:1
#
# Multi-stage build for the Team Task Manager.
# Stage 1 compiles the React frontend; stage 2 runs the FastAPI backend and
# serves the compiled frontend, so the whole app deploys as ONE Railway service.

# ---------- Stage 1: build the React frontend ----------
FROM node:20-alpine AS frontend
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ---------- Stage 2: FastAPI backend + static frontend ----------
FROM python:3.12-slim AS backend
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./

# The FastAPI app serves any files found in ./static (see app/main.py).
COPY --from=frontend /app/frontend/dist ./static

EXPOSE 8000

# Railway injects $PORT; fall back to 8000 for local `docker run`.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
