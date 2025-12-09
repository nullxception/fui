import z from "zod";
import type { DiffusionParams } from "./diffusionparams";
import type { TriggerWord } from "./triggerword";

export const appSettingsSchema = z.object({
  background: z.string().optional(),
  maxWidth: z.number(),
  maxHeight: z.number(),
});

export type AppSettings = z.infer<typeof appSettingsSchema>;
export interface UserConfig {
  diffusion: DiffusionParams;
  settings: AppSettings;
  triggerWords: TriggerWord[];
}
