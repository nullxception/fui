import z from "zod";

export const jobsTypeSchema = z.literal(["txt2img", "convert"]);

export const jobStatusSchema = z.literal(["running", "complete", "error"]);

const dbOptional = <T extends z.ZodTypeAny>(schema: T) =>
  schema
    .nullable()
    .transform((v) => v ?? undefined)
    .optional();

export const jobSchema = z.object({
  id: z.string(),
  type: jobsTypeSchema,
  status: jobStatusSchema,
  createdAt: z.number(),
  startedAt: dbOptional(z.number()),
  completedAt: dbOptional(z.number()),
  result: dbOptional(z.string()),
});

export const logTypeSchema = z.literal(["stdout", "stderr", "result"]);
export const logEntrySchema = z.object({
  id: z.string(),
  type: logTypeSchema,
  message: z.string(),
  timestamp: z.number(),
});

export type JobType = z.infer<typeof jobsTypeSchema>;
export type JobStatus = z.infer<typeof jobStatusSchema>;
export type Job = z.infer<typeof jobSchema>;
export type LogType = z.infer<typeof logTypeSchema>;
export type LogEntry = z.infer<typeof logEntrySchema>;
