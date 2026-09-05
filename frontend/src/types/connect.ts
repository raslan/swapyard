export interface HarnessStep {
  title: string;
  body: string;
  code: string | null;
}

export interface HarnessSummary {
  id: string;
  name: string;
  configPath: string;
  format: "json" | "yaml" | "jsonc";
  docsUrl: string;
  icon: string | null;
}

export interface HarnessDetail extends HarnessSummary {
  steps: HarnessStep[];
  config: string;
  baseUrlSource: "settings" | "placeholder";
}
