import { z } from "zod";
import { quantizationSchema } from "./ggml";

export const diffusionModelTypeSchema = z.union([
  z.literal("full"),
  z.literal("standalone"),
]);

export const diffusionParamsSchema = z.object({
  model: z.string(),
  modelType: diffusionModelTypeSchema,
  quantizationType: quantizationSchema.optional(),
  vae: z.string().optional(),
  clipL: z.string().optional(),
  clipG: z.string().optional(),
  t5xxl: z.string().optional(),
  llm: z.string().optional(),
  prompt: z.string().optional(),
  negativePrompt: z.string().optional(),
  steps: z.number(),
  cfgScale: z.number(),
  seed: z.number(),
  width: z.number(),
  height: z.number(),
  clipSkip: z.number(),
  diffusionFa: z.boolean().optional(),
  samplingMethod: z.string().optional(),
  scheduler: z.string().optional(),
  rng: z.string().optional(),
  samplerRng: z.string().optional(),
  diffusionConvDirect: z.boolean().optional(),
  vaeConvDirect: z.boolean().optional(),
  threads: z.number(),
  offloadToCpu: z.boolean().optional(),
  forceSdxlVaeConvScale: z.boolean().optional(),
  upscaleModel: z.string().optional(),
  upscaleRepeats: z.number().optional(),
  upscaleTileSize: z.number().optional(),
  batchMode: z.boolean().optional(),
  batchCount: z.number().optional(),
  verbose: z.boolean().optional(),
});

export type DiffusionModelType = z.infer<typeof diffusionModelTypeSchema>;

export type DiffusionParams = z.infer<typeof diffusionParamsSchema>;
