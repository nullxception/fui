import type { DiffusionModelType, DiffusionParams } from "./diffusionparams";
import { GGML_WEIGHTS_TYPE, type Quantization } from "./ggml";
import type { ConvertParams } from "./quantization";
import type { ExtraDataType, TriggerWord } from "./triggerword";
import type { AppSettings, UserConfig } from "./userconfig";

export { GGML_WEIGHTS_TYPE };

export type {
  AppSettings,
  ConvertParams,
  DiffusionModelType,
  DiffusionParams,
  ExtraDataType,
  Quantization,
  TriggerWord,
  UserConfig,
};

export type JobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface Job {
  id: string;
  status: JobStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: DiffusionResult;
  logs: LogData[];
}

export interface LogData {
  type: "stdout" | "stderr";
  message: string;
}

export interface DiffusionResult {
  image?: Image;
  message?: string;
}

export interface Models {
  checkpoints: string[];
  embeddings: string[];
  loras: string[];
  vaes: string[];
  upscalers: string[];
  textEncoders: string[];
  llms: string[];
}

export interface Image {
  name: string;
  url: string;
  mtime: number;
  metadata: Record<string, unknown>;
}
