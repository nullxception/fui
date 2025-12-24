import { promises as fs } from "fs";
import path from "path";

const _dirname =
  import.meta.dir.startsWith("/$bunfs/root") ||
  import.meta.dir.startsWith("B:\\~BUN\\root")
    ? process.execPath
    : import.meta.dir;

export const ROOT_DIR = path.join(_dirname, "..");
export const MODELS_DIR =
  process.env.FUI_MODELS_DIR || path.join(ROOT_DIR, "models");

export const CHECKPOINT_DIR = path.join(MODELS_DIR, "checkpoint");
export const EMBEDDING_DIR = path.join(MODELS_DIR, "embedding");
export const LORA_DIR = path.join(MODELS_DIR, "lora");
export const VAE_DIR = path.join(MODELS_DIR, "vae");
export const UPSCALER_DIR = path.join(MODELS_DIR, "upscaler");
export const TEXT_ENCODER_DIR = path.join(MODELS_DIR, "textencoder");
export const LLM_DIR = path.join(MODELS_DIR, "llm");
export const PUBLIC_DIR = path.join(ROOT_DIR, "public");
export const OUTPUT_DIR = path.join(ROOT_DIR, "output");
export const THUMBS_DIR =
  process.env.FUI_THUMBNAILS_DIR || path.join(ROOT_DIR, ".thumbs");
export const UPLOAD_DIR = path.join(ROOT_DIR, "upload");
export const CONFIG_PATH = path.join(ROOT_DIR, "config.yaml");

export async function ensureDirectories() {
  const dirs = [
    CHECKPOINT_DIR,
    EMBEDDING_DIR,
    LORA_DIR,
    VAE_DIR,
    UPSCALER_DIR,
    TEXT_ENCODER_DIR,
    LLM_DIR,
    OUTPUT_DIR,
    THUMBS_DIR,
    UPLOAD_DIR,
  ];
  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }
}
