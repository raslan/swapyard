export const content = {
  github: "https://github.com/raslan/swapyard",
  compose: `services:
  swapyard:
    image: ghcr.io/raslan/swapyard:latest
    container_name: swapyard
    restart: unless-stopped
    ports:
      - "8000:8000"
    volumes:
      - ~/.cache/huggingface/hub:/home/app/.cache/huggingface/hub
      - ./config.yaml:/app/llama-swap-config.yaml
      - ./data:/app/data`,
  hero: {
    headline: "Find, download, and configure GGUF models for llama-swap.",
    sub: "Swapyard edits llama-swap's config.yaml for you. It does not replace llama-swap itself.",
  },
  quants: [
    { label: "Q4_K_M", gb: 4.1, fits: true },
    { label: "Q5_K_M", gb: 4.9, fits: true },
    { label: "Q6_K", gb: 5.8, fits: true },
    { label: "Q8_0", gb: 7.9, fits: false },
  ],
  vramCapacityGb: 6,
  recommendedQuant: "Q6_K",
  features: [
    {
      label: "# discover",
      title: "Discover",
      body: "Browse Hugging Face without leaving the app. Trending, Vision and multimodal, Agentic and coding, and Embedding tabs come from one real Hugging Face query, not fabricated categories. Full text search keeps a shareable URL.",
      video: "/videos/01-browsing-discover-and-search.webm",
      caption: "Browsing the Discover homepage, then searching with the URL updating live.",
    },
    {
      label: "# fit check",
      title: "Know before you download",
      body: "Every model card shows param count, total size, and when it was last updated. Capability badges for Vision, Tools, Reasoning, and Code come from the model's own Hugging Face tags. Declare your GPU once in Settings and every quant shows whether it fits, with the largest fitting quant marked Recommended.",
      video: "/videos/02-selecting-a-model-to-download.webm",
      caption: "Opening a model, reading its README, and checking VRAM fit on each quant.",
    },
    {
      label: "# download",
      title: "Download",
      body: "Downloads run over server-sent events with live progress. Some models download through Hugging Face's Xet backend, which reports progress in a couple of big jumps instead of smooth per-chunk updates. Swapyard labels that honestly instead of showing a misleading bar.",
      video: "/videos/03-download-progress.webm",
      caption: "A real model download, from click to completion.",
    },
    {
      label: "# generate config",
      title: "One dialog, not hand-written YAML",
      body: "Turn a downloaded model into a working llama-swap config entry. The context window slider is capped at the model's real trained context length. KV-cache quantization options come live from llama-server --help, never hardcoded. Sampler parameters are pulled from the model's own generation_config.json, with a one-click fill you still have to press yourself. Reasoning controls live in an Advanced tab.",
      video: "/videos/04-adding-a-config-entry.webm",
      caption: "Creating a config entry: context slider, KV-cache quant, sampler fill, reasoning controls.",
    },
    {
      label: "# history",
      title: "Every change is a commit",
      body: "The config editor is Monaco, with YAML syntax highlighting and autocomplete sourced from live llama-server --help output. Every apply validates the file, writes it, optionally health-checks against a running llama-swap, and commits the change to a git-backed revision history with a diff view.",
      video: "/videos/05-git-managed-config-history.webm",
      caption: "The config editor and a real git diff of the entry just created.",
    },
  ],
  safety: {
    label: "# fit, not guesswork",
    title: "Your hardware tells us",
    body: "Swapyard does not calculate VRAM or context math and hope it is right. Every launch relies on llama-server's own --fit flag, which reads real free device memory at the moment it starts. An earlier version of this project tried to predict VRAM usage statically and was wrong by about 20x on real models, twice, in two different ways. Now the hardware answers instead of a formula.",
  },
  manage: {
    label: "# manage",
    title: "One row per model",
    body: "The Manage screen aggregates every downloaded file into one row per model, with size on disk. Multiple quants of the same model are a normal thing to keep around for different speed and quality tradeoffs, so a single quant can be deleted on its own without touching the rest.",
  },
  facts: {
    label: "# facts",
    items: [
      "One Docker image, one container, port 8000 by default.",
      "Needs a Hugging Face cache directory, llama-swap's config.yaml, and a small local data directory for settings and revision history.",
      "Backend is FastAPI. Frontend is React and TypeScript. The config editor is Monaco.",
      "What Swapyard shows always matches what is actually on disk, because it reads Hugging Face's own local cache directory instead of keeping a separate database.",
    ],
  },
  footer: {
    body: "Swapyard is self-hosted. No accounts, no cloud component, just a UI over your own hardware and your own llama-swap instance.",
    license: "MIT licensed.",
  },
} as const;
