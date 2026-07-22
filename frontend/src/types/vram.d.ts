export interface QuantEstimate {
  quant: string;
  files: string[];
  weightBytes: number;
  contextLength: number;
  kvCacheMaxBytes: number;
  kvCacheHalfBytes: number;
}
