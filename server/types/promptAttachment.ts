import { z } from "zod";

export const promptAttachmentTypeSchema = z.literal(["embedding", "lora"]);

export const promptAttachmentSchema = z.object({
  type: promptAttachmentTypeSchema,
  target: z.string(),
  strength: z.number().optional(),
  words: z.array(z.string()),
});

export type PromptAttachmentType = z.infer<typeof promptAttachmentTypeSchema>;
export type PromptAttachment = z.infer<typeof promptAttachmentSchema>;
