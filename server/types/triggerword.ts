import { z } from "zod";

export const extraDataTypeSchema = z.union([
  z.literal("embedding"),
  z.literal("lora"),
]);

export const triggerWordSchema = z.object({
  type: extraDataTypeSchema,
  target: z.string(),
  loraStrength: z.number().optional(),
  words: z.array(z.string()),
});

export type ExtraDataType = z.infer<typeof extraDataTypeSchema>;
export type TriggerWord = z.infer<typeof triggerWordSchema>;
