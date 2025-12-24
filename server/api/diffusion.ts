import { TRPCError } from "@trpc/server";
import { Glob } from "bun";
import path from "path";
import {
  CHECKPOINT_DIR,
  EMBEDDING_DIR,
  LLM_DIR,
  LORA_DIR,
  MODELS_DIR,
  TAE_DIR,
  TEXT_ENCODER_DIR,
  UPSCALER_DIR,
  VAE_DIR,
} from "server/dirs";
import { startDiffusion } from "server/services/diffusion";
import { createJob } from "server/services/jobs";
import type { DiffusionParams, Models } from "server/types";

function putModelFiles(
  file: string,
  subdir: string,
  target: string[],
  recursive = true,
  match?: RegExp,
) {
  const ext = match ? match : /.*\.(ckpt|safetensors|sft|pth|gguf)$/;
  if (!ext.test(file)) return;
  if (file.startsWith(subdir + path.sep)) {
    const rel = path.relative(subdir, file);
    if (!recursive && rel.includes(path.sep)) return;
    target.push(rel);
  }
}

function sortPath(a: string, b: string) {
  const aInSub = a.includes(path.sep);
  const bInSub = b.includes(path.sep);
  if (aInSub && !bInSub) return 1;
  if (!aInSub && bInSub) return -1;
  return a.localeCompare(b);
}

export async function listDiffusionModels() {
  try {
    const glob = new Glob("**/*");
    const models: Models = {
      checkpoints: [],
      embeddings: [],
      loras: [],
      vaes: [],
      upscalers: [],
      llms: [],
      textEncoders: [],
      taes: [],
    };

    const rCheckpoint = path.relative(MODELS_DIR, CHECKPOINT_DIR);
    const rEmbedding = path.relative(MODELS_DIR, EMBEDDING_DIR);
    const rLora = path.relative(MODELS_DIR, LORA_DIR);
    const rVae = path.relative(MODELS_DIR, VAE_DIR);
    const rUpscaler = path.relative(MODELS_DIR, UPSCALER_DIR);
    const rLlm = path.relative(MODELS_DIR, LLM_DIR);
    const rTae = path.relative(MODELS_DIR, TAE_DIR);
    const rTextEncoder = path.relative(MODELS_DIR, TEXT_ENCODER_DIR);

    for await (const file of glob.scan(MODELS_DIR)) {
      putModelFiles(file, rCheckpoint, models.checkpoints);
      putModelFiles(file, rEmbedding, models.embeddings, false);
      putModelFiles(file, rLora, models.loras);
      putModelFiles(file, rVae, models.vaes);
      putModelFiles(file, rUpscaler, models.upscalers);
      putModelFiles(file, rLlm, models.llms);
      putModelFiles(file, rTextEncoder, models.textEncoders);
      putModelFiles(file, rTae, models.taes);
    }

    for (const key in models) {
      models[key as keyof Models].sort(sortPath);
    }

    return models;
  } catch (error) {
    console.error("Error reading models directory:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to list models",
      cause: error,
    });
  }
}

export async function diffusionStart(params: DiffusionParams) {
  if (!params.model) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Model is required",
    });
  }

  try {
    const job = createJob("txt2img");
    startDiffusion(job.id, params);
    return { jobId: job.id };
  } catch (error) {
    console.error("Error parsing request body:", error);
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Error starting diffusion",
      cause: error,
    });
  }
}
