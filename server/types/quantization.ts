import { z } from "zod";

export const convertParamsSchema = z.object({
  model: z.string(),
  output: z.string(),
  type: z.string(),
});

export type ConvertParams = z.infer<typeof convertParamsSchema>;
