import { z } from "zod";

export const suggestionTagSchema = z.object({
  name: z.coerce.string().default(""),
  type: z.coerce.number().default(-1),
  postCount: z.coerce.number().default(-1),
});
export type SuggestionTag = z.infer<typeof suggestionTagSchema>;
