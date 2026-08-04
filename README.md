# Swapyard

A self-hosted web UI for finding, downloading, and running GGUF models with
[llama-swap](https://github.com/mostlygeek/llama-swap). Search Hugging Face,
download quants straight into your existing HF cache, and turn a downloaded
model into a working `llama-swap` config entry without hand-writing YAML.

Swapyard edits `llama-swap`'s `config.yaml` for you; it doesn't replace
`llama-swap` itself. Run the two side by side (compose example below).

## Features

- **Browse** — a Discover homepage split into Trending / Vision & multimodal /
  Agentic & coding / Embedding models tabs (real HF signals, not fabricated
  categories), sortable by downloads/likes/last-updated, plus full-text
  search (with a shareable `?q=` URL) that falls back to a flat result grid.
  Each model card shows params, total size, capabilities (Vision/Tools/
  Reasoning/Code), and last-updated at a glance. Click through for README,
  files, and per-quant size.
- **VRAM fit check** — declare your hardware once in Settings (GPU list with
  per-card VRAM, or a unified-memory pool for APU/iGPU/Apple Silicon) and
  each quant on a model's page shows whether it fits.
- **Download** — start downloads from the model page, live progress over
  SSE, honest labeling for Hugging Face's Xet backend (which only reports
  progress in a couple of big jumps, not smooth per-chunk).
- **Manage** — one row per downloaded model (aggregated across all its
  files, not per-file), size on disk, delete. Individual quants can also be
  deleted one at a time when a model has more than one downloaded.
- **Create config entry** — turn a downloaded model into a `llama-swap`
  model block with one dialog instead of hand-writing YAML:
  - context-window slider capped at the model's real trained context length
    (read from HF's GGUF metadata) when known, generic fallback otherwise
  - KV-cache-quantization dropdown sourced live from `llama-server --help`
    (never hardcoded — same source the config editor's intellisense uses)
  - sampler-parameter recommendations pulled from the model's
    `generation_config.json` (via its base-model repo) or scraped from the
    README as a fallback, with a one-click "fill" button — never applied
    automatically
  - an Advanced tab for reasoning controls (`--reasoning`,
    `--reasoning-budget`, `--reasoning-budget-message`)
  - always emits `--flash-attn on` and `--fit on`, so llama-server sizes
    `-ngl`/context against real free device memory at launch instead of
    guessed static values
- **Config editor** — full `config.yaml` editor (Monaco) with YAML syntax
  highlighting and hover/autocomplete sourced from the real, live
  `llama-server --help` output — not a hand-maintained flag list. Apply
  pipeline validates, writes, optionally health-checks against a running
  `llama-swap`, and commits every change to a git-backed revision history
  with diff view.
- **README rendering** — rendered in a sandboxed iframe
  (`allow-same-origin allow-popups`, never `allow-scripts`) rather than
  through an HTML sanitizer allowlist.

## Running it

Swapyard is one Docker image (`ghcr.io/raslan/swapyard`) serving both the
API and the built frontend on port `8000`. It needs:

- a Hugging Face cache directory (so downloads land where `llama-swap`'s
  `llama-server -hf ...` processes can find them without re-downloading)
- `llama-swap`'s `config.yaml`, mounted read/write (Swapyard edits it in
  place)
- a small local `data` directory for `settings.json` and the git-backed
  config revision history

### Minimal compose (Swapyard only)

Use this if you already run `llama-swap` some other way and just want the
UI:

```yaml
services:
  swapyard:
    image: ghcr.io/raslan/swapyard:latest
    container_name: swapyard
    restart: unless-stopped
    ports:
      - "8000:8000"
    volumes:
      - ~/.cache/huggingface/hub:/home/app/.cache/huggingface/hub
      - ./config.yaml:/app/llama-swap-config.yaml
      - ./data:/app/data
```

`config.yaml` must exist before first run — it's mounted as a single file,
and Docker creates a **directory** at that path instead if nothing's there
yet, breaking the mount:

```bash
touch config.yaml
```

The HF cache dir and `data/` don't need this — Docker auto-creates missing
directory mounts, and both get populated on their own (`data/` on first
write, the cache dir on first download).

The HF cache path and `config.yaml` path here must be the **exact same
directories/files** your separately-run `llama-swap` uses — not copies, not
similar-looking paths. Swapyard writes config changes and expects `-hf`
downloads to already be visible to `llama-server` processes `llama-swap`
spawns; point both at the identical host paths `llama-swap` itself mounts,
or config edits won't reach it and downloaded models will re-download.

**Worked example.** Say your existing `llama-swap` service looks like this:

```yaml
services:
  llama-swap:
    image: ghcr.io/mostlygeek/llama-swap:cuda
    environment:
      - HF_HOME=/models/.hf-cache
    volumes:
      - /srv/models:/models
      - /srv/llama-swap/config.yaml:/app/config.yaml
```

Two things to resolve before writing Swapyard's mounts:

1. **The cache path isn't `/srv/models` itself.** `HF_HOME=/models/.hf-cache`
   means the actual cache root, from the host's point of view, is
   `/srv/models/.hf-cache` — and Swapyard's mount target is specifically the
   `hub` subfolder inside it, `/srv/models/.hf-cache/hub`. If `HF_HOME` were
   unset, the default is `<mounted dir>/.cache/huggingface`, so watch for that
   variant too.
2. **Reuse the same host `config.yaml`**, not a copy: `/srv/llama-swap/config.yaml`.

Swapyard's volumes then become:

```yaml
    volumes:
      - /srv/models/.hf-cache/hub:/home/app/.cache/huggingface/hub
      - /srv/llama-swap/config.yaml:/app/llama-swap-config.yaml
      - ./data:/app/data
```

If you're not sure your `HF_HOME` maps out this way, `ls` the host path you're
about to mount and confirm it actually contains `models--org--name`-style
folders before starting Swapyard — mounting the wrong subfolder silently
looks fine on boot and only breaks the first time you hit a repo llama-swap
already downloaded.

### Full compose (Swapyard + llama-swap)

This is the whole stack: Swapyard for browsing/downloading/config-editing,
and `llama-swap` actually serving the models. Both containers share the
same Hugging Face cache and the same `config.yaml`.

`llama-swap` needs `--watch-config` so it reloads when Swapyard writes a new
`config.yaml` — otherwise you'd have to restart the container by hand after
every change made through the UI.

```yaml
services:
  swapyard:
    image: ghcr.io/raslan/swapyard:latest
    container_name: swapyard
    restart: unless-stopped
    ports:
      - "8000:8000"
    volumes:
      - hf-cache:/home/app/.cache/huggingface/hub
      - ./config.yaml:/app/llama-swap-config.yaml
      - ./data:/app/data

  llama-swap:
    image: ghcr.io/mostlygeek/llama-swap:cpu
    container_name: llama-swap
    restart: unless-stopped
    command: ["--config", "/app/config.yaml", "--watch-config"]
    ports:
      - "8080:8080"
    volumes:
      - hf-cache:/home/app/.cache/huggingface/hub
      - ./config.yaml:/app/config.yaml

volumes:
  hf-cache:
```

Notes:
- `llama-swap:cpu` is the plain CPU image — swap it for `:cuda`, `:vulkan`,
  `:intel`, `:musa`, or `:unified-cuda` if you have a GPU (see
  [llama-swap's docker tags](https://github.com/mostlygeek/llama-swap/pkgs/container/llama-swap)).
- The Hugging Face cache path inside `llama-swap`'s own image depends on
  which image variant you use — check it actually resolves to the same
  cache dir `-hf` downloads use, or model files downloaded once will be
  re-downloaded by `llama-server` inside the `llama-swap` container.
- After both containers are up, open Swapyard's Settings page and set
  **llama-swap URL** to `http://llama-swap:8080` (the service name above,
  reachable over the compose network). This is a persisted setting, not an
  env var — it's stored in `./data/settings.json` and can be changed at
  runtime without restarting the container. It's optional: without it,
  Swapyard still writes and validates `config.yaml`, it just can't confirm
  the new config actually came up healthy in `llama-swap`.

`config.yaml` must exist before first run (`touch config.yaml`), same as the
minimal setup — everything else in the volumes is fine unmounted.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `HF_TOKEN` | no | Hugging Face token, for private/gated repos. |

## Local development

```bash
# backend
cd backend
uv sync
uv run uvicorn app.main:app --reload

# frontend
cd frontend
npm install
npm run dev
```

Backend tests: `cd backend && uv run pytest`
Frontend tests: `cd frontend && npm test`
