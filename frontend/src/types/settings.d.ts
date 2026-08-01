export interface GpuDevice {
  name: string | null;
  vramGb: number;
}

export interface HardwareProfile {
  kind: "gpus" | "unified";
  gpus: GpuDevice[];
  systemRamGb: number | null;
}

export interface Settings {
  hardware: HardwareProfile | null;
  llamaSwapUrl: string | null;
  onboarded: boolean;
}
