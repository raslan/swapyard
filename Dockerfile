# ---- Stage: extract llama-server flags (discarded) ----
# This image's ENTRYPOINT is already /app/llama-server, so --help goes
# straight to it - passing the binary path explicitly as an arg instead
# fails with "invalid argument" (verified via
# `docker run --rm ghcr.io/ggml-org/llama.cpp:server --help`).
FROM ghcr.io/ggml-org/llama.cpp:server AS flags-extract
RUN /app/llama-server --help > /tmp/llama-server-help.txt 2>&1 || true

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
WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

COPY backend/pyproject.toml backend/uv.lock ./backend/
RUN cd backend && uv sync --no-dev --frozen

COPY backend/app ./backend/app
COPY --from=flags-extract /tmp/llama-server-help.txt /tmp/llama-server-help.txt
COPY scripts/parse_llama_server_flags.py /tmp/parse_llama_server_flags.py
RUN python3 /tmp/parse_llama_server_flags.py < /tmp/llama-server-help.txt > /app/backend/app/llama_server_flags.json
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

RUN mkdir -p /home/app/.cache/huggingface/hub && chown -R app:app /app /home/app
# /tmp (not /app) so this stays writable under an arbitrary --user override too -
# unlike /app, it's not baked chown'd to uid 1000 at build time, it relies on the
# base image's default sticky-bit 1777 permissions instead. Set only now, after
# the build-time `uv sync` above - that step runs as root and must NOT write into
# /tmp itself, or the cache files it creates get baked into the image pre-owned
# by root, which defeats the whole point (sticky bit lets any uid CREATE new
# files in /tmp, it doesn't retroactively grant write access to ones that
# already exist there owned by someone else).
ENV UV_CACHE_DIR=/tmp/.uv-cache
USER app

WORKDIR /app/backend
EXPOSE 8000
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
