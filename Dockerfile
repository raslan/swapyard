# ---- Stage: extract llama-server flags (discarded) ----
# This image's ENTRYPOINT is already /app/llama-server, so --help goes
# straight to it - passing the binary path explicitly as an arg instead
# fails with "invalid argument" (verified via
# `docker run --rm ghcr.io/ggml-org/llama.cpp:server --help`)
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
FROM python:3.12-alpine
RUN adduser -D -u 1000 -s /bin/sh app
WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

COPY backend/pyproject.toml backend/uv.lock ./backend/
RUN cd backend && uv sync --no-dev --frozen

COPY backend/app ./backend/app
COPY --from=flags-extract /tmp/llama-server-help.txt /tmp/llama-server-help.txt
COPY scripts/parse_llama_server_flags.py /tmp/parse_llama_server_flags.py
RUN python3 /tmp/parse_llama_server_flags.py < /tmp/llama-server-help.txt > /app/backend/app/llama_server_flags.json
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

RUN mkdir -p /home/app/.cache/huggingface/hub && chown -R app:app /app /home/app \
    # `useradd --create-home` makes /home/app itself mode 700 (owner-only) - that
    # blocks path traversal into the bind-mounted .cache/huggingface/hub below for
    # any uid other than 1000, even though the mounted directory's own permissions
    # (host-side, whatever it's chowned to) would otherwise be fine. Confirmed via
    # a real --user 568:568 run: without this, `ls` on the mount point itself fails
    # with "Permission denied" before ever reaching the mount's own perms.
    && chmod 755 /home/app
USER app

WORKDIR /app/backend
EXPOSE 8000
# Calls the venv's own uvicorn directly rather than `uv run uvicorn ...` - `uv run`
# re-syncs the venv against the lockfile on every start (including dev deps, since
# --no-dev only applied to the build-time sync above), which means every container
# boot needs write access to /app/backend/.venv - baked owned by uid 1000 at build
# time, so this breaks under an arbitrary --user override (e.g. matching a NAS's
# non-1000 "apps" uid). Dependencies are already fully installed at build time;
# nothing at runtime needs to touch the venv, or `uv`, at all.
CMD [".venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
