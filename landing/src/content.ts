export const content = {
  github: "https://github.com/raslan/swapyard",
  llamaSwap: "https://github.com/mostlygeek/llama-swap",
  hero: {
    headline:
      "Swapyard is a self-hosted UI for finding, downloading, and configuring GGUF models with llama-swap.",
    paragraphs: [
      "I was using Ollama, and it had one flaw for me: not enough control.",
      "I wanted to build on the shoulders of giants, llama.cpp and llama-swap, and put together just enough of a UI to make that side of local AI genuinely comfortable to run.",
    ],
  },
  install: {
    label: "# install",
    title: "One container. Bring your own llama-swap.",
    body: "Full setup, docker-compose, and configuration options are documented on GitHub.",
  },
  quants: [
    { label: "Q4_K_M", gb: 4.1, fits: true },
    { label: "Q5_K_M", gb: 4.9, fits: true },
    { label: "Q6_K", gb: 5.8, fits: true },
    { label: "Q8_0", gb: 7.9, fits: false },
  ],
  vramCapacityGb: 6,
  recommendedQuant: "Q6_K",
  discover: {
    label: "# discover",
    title: "Browse Hugging Face, natively",
    body: "Trending, Vision, Agentic, and Embedding tabs pull from one real Hugging Face query, not fabricated categories. Search updates the URL live, so a result is always one link away.",
    video: "/videos/01-browsing-discover-and-search.webm",
    caption: "Browsing the Discover homepage, then searching with the URL updating live.",
  },
  fitCheck: {
    label: "# fit check",
    title: "Know before you download",
    body: "Every model card shows params, size, and freshness at a glance. Declare your GPU once, and every quant tells you if it fits, with the best one marked Recommended.",
    video: "/videos/02-selecting-a-model-to-download.webm",
    caption: "Opening a model, reading its README, and checking VRAM fit on each quant.",
  },
  download: {
    label: "# download",
    title: "Downloads you can trust",
    body: "Progress streams live over SSE. When a model ships through Hugging Face's Xet backend, progress jumps in two big steps instead of smooth ticks, and Swapyard says so instead of faking a bar.",
    video: "/videos/03-download-progress.webm",
    caption: "A real model download, from click to completion.",
  },
  configGen: {
    label: "# generate config",
    title: "Skip the YAML",
    body: "Turn any downloaded model into a llama-swap config entry from one dialog. Context length caps at what the model actually supports. KV-cache options come live from llama-server, never hardcoded. Sampler defaults come from the model itself, one click to fill, never applied automatically.",
    video: "/videos/04-adding-a-config-entry.webm",
    caption: "Creating a config entry: context slider, KV-cache quant, sampler fill, reasoning controls.",
  },
  history: {
    label: "# history",
    title: "Every change, a commit",
    body: "The config editor is Monaco, with real llama-server autocomplete. Apply validates, writes, and commits to a git-backed history you can diff like any other file.",
    video: "/videos/05-git-managed-config-history.webm",
    caption: "The config editor and a real git diff of the entry just created.",
  },
  safety: {
    label: "# fit, not guesswork",
    title: "Your hardware tells us",
    body: "Swapyard never calculates VRAM and hopes it is right. It relies on llama-server's own --fit flag, reading real free memory the moment it launches. Your hardware answers. Not a formula.",
  },
  manage: {
    label: "# manage",
    title: "One row per model",
    body: "Every downloaded file rolls into one row, with size on disk. Keep multiple quants of the same model around for different speed and quality tradeoffs, and delete just one without touching the rest.",
  },
  footer: {
    body: "Swapyard is self-hosted. No accounts, no cloud component, just a UI over your own hardware and your own llama-swap instance.",
    license: "MIT licensed.",
  },
} as const;
