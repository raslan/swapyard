export interface ConfigData {
  content: string;
  hash: string;
}

export interface ConfigStatus {
  status: string | null;
  timestamp: number | null;
}

export interface ConfigRevision {
  sha: string;
  timestamp: number;
  status: string;
  content: string;
}

export interface ApplyConfigResult {
  status: string;
  logs: string | null;
}

export interface LlamaServerFlag {
  flag: string;
  aliases: string[];
  description: string;
  default: string | null;
}
