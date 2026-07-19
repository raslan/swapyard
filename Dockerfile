# ---- Stage 1: build frontend (discarded) ----
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: shipped image ----
FROM python:3.12-slim
RUN useradd --uid 1000 --create-home --shell /bin/bash app
ENV UV_CACHE_DIR=/app/.uv-cache
WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

COPY backend/pyproject.toml backend/uv.lock ./backend/
RUN cd backend && uv sync --no-dev --frozen

COPY backend/app ./backend/app
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

RUN mkdir -p /home/app/.cache/huggingface/hub && chown -R app:app /app /home/app
USER app

WORKDIR /app/backend
EXPOSE 8000
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
