import { z } from "zod";

export const SDImageMetadataSchema = z.object({
  prompt: z.string(),
  negativePrompt: z.string(),
  upscaled: z.boolean().default(false),
  baseWidth: z.number(),
  baseHeight: z.number(),
  model: z.string(),
  steps: z.number(),
  cfgScale: z.number(),
  seed: z.number(),
  rng: z.string(),
  samplingMethod: z.string(),
  scheduler: z.string(),
  version: z.string(),
  vae: z.string().optional(),
  textEncoders: z.array(z.string()).optional(),
});

export const ImageSchema = z.object({
  name: z.string(),
  url: z.string(),
  mtime: z.number(),
  width: z.number(),
  height: z.number(),
  metadata: SDImageMetadataSchema,
});

export type SDImageParams = z.infer<typeof SDImageMetadataSchema>;
export type SDImage = z.infer<typeof ImageSchema>;
export interface ExifImage {
  ImageWidth?: number;
  ImageHeight?: number;
  parameters?: string;
}
