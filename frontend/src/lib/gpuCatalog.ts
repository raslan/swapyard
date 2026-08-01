export interface GpuCatalogEntry {
  name: string;
  vramGb: number;
}

// Common GPUs with well-known VRAM sizes, for the Settings page's model
// picker. Not exhaustive — anything not listed here still works via the
// combobox's free-text fallback (pick a name, enter VRAM manually).
export const GPU_CATALOG: GpuCatalogEntry[] = [
  // NVIDIA GeForce (desktop)
  { name: "NVIDIA GeForce RTX 5090", vramGb: 32 },
  { name: "NVIDIA GeForce RTX 5080", vramGb: 16 },
  { name: "NVIDIA GeForce RTX 5070 Ti", vramGb: 16 },
  { name: "NVIDIA GeForce RTX 5070", vramGb: 12 },
  { name: "NVIDIA GeForce RTX 5060 Ti", vramGb: 16 },
  { name: "NVIDIA GeForce RTX 4090", vramGb: 24 },
  { name: "NVIDIA GeForce RTX 4080 SUPER", vramGb: 16 },
  { name: "NVIDIA GeForce RTX 4080", vramGb: 16 },
  { name: "NVIDIA GeForce RTX 4070 Ti SUPER", vramGb: 16 },
  { name: "NVIDIA GeForce RTX 4070 Ti", vramGb: 12 },
  { name: "NVIDIA GeForce RTX 4070 SUPER", vramGb: 12 },
  { name: "NVIDIA GeForce RTX 4070", vramGb: 12 },
  { name: "NVIDIA GeForce RTX 4060 Ti (16GB)", vramGb: 16 },
  { name: "NVIDIA GeForce RTX 4060 Ti (8GB)", vramGb: 8 },
  { name: "NVIDIA GeForce RTX 4060", vramGb: 8 },
  { name: "NVIDIA GeForce RTX 3090 Ti", vramGb: 24 },
  { name: "NVIDIA GeForce RTX 3090", vramGb: 24 },
  { name: "NVIDIA GeForce RTX 3080 Ti", vramGb: 12 },
  { name: "NVIDIA GeForce RTX 3080 (12GB)", vramGb: 12 },
  { name: "NVIDIA GeForce RTX 3080 (10GB)", vramGb: 10 },
  { name: "NVIDIA GeForce RTX 3070 Ti", vramGb: 8 },
  { name: "NVIDIA GeForce RTX 3070", vramGb: 8 },
  { name: "NVIDIA GeForce RTX 3060 Ti", vramGb: 8 },
  { name: "NVIDIA GeForce RTX 3060 (12GB)", vramGb: 12 },

  // NVIDIA RTX / Quadro (workstation)
  { name: "NVIDIA RTX 6000 Ada Generation", vramGb: 48 },
  { name: "NVIDIA RTX 5000 Ada Generation", vramGb: 32 },
  { name: "NVIDIA RTX 4500 Ada Generation", vramGb: 24 },
  { name: "NVIDIA RTX 4000 Ada Generation", vramGb: 20 },
  { name: "NVIDIA RTX A6000", vramGb: 48 },
  { name: "NVIDIA RTX A5000", vramGb: 24 },
  { name: "NVIDIA RTX A4000", vramGb: 16 },

  // NVIDIA datacenter
  { name: "NVIDIA H100 (80GB)", vramGb: 80 },
  { name: "NVIDIA A100 (80GB)", vramGb: 80 },
  { name: "NVIDIA A100 (40GB)", vramGb: 40 },
  { name: "NVIDIA L40S", vramGb: 48 },

  // AMD Radeon
  { name: "AMD Radeon RX 7900 XTX", vramGb: 24 },
  { name: "AMD Radeon RX 7900 XT", vramGb: 20 },
  { name: "AMD Radeon RX 7900 GRE", vramGb: 16 },
  { name: "AMD Radeon RX 7800 XT", vramGb: 16 },
  { name: "AMD Radeon RX 7700 XT", vramGb: 12 },
  { name: "AMD Radeon RX 7600", vramGb: 8 },
  { name: "AMD Radeon RX 6950 XT", vramGb: 16 },
  { name: "AMD Radeon RX 6900 XT", vramGb: 16 },
  { name: "AMD Radeon RX 6800 XT", vramGb: 16 },
  { name: "AMD Radeon RX 6800", vramGb: 16 },
  { name: "AMD Radeon RX 6700 XT", vramGb: 12 },
  { name: "AMD Radeon Pro W7900", vramGb: 48 },
  { name: "AMD Instinct MI300X", vramGb: 192 },

  // Intel Arc
  { name: "Intel Arc A770", vramGb: 16 },
  { name: "Intel Arc A750", vramGb: 8 },
  { name: "Intel Arc B580", vramGb: 12 },
];
