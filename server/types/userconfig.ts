import z from "zod";
import type { DiffusionParams } from "./diffusionparams";
import type { PromptAttachment } from "./promptAttachment";

export const appSettingsSchema = z.object({
  background: z.string().optional(),
  maxWidth: z.number(),
  maxHeight: z.number(),
});

export type AppSettings = z.infer<typeof appSettingsSchema>;
export interface UserConfig {
  diffusion: DiffusionParams;
  settings: AppSettings;
  promptAttachment: PromptAttachment[];
}
