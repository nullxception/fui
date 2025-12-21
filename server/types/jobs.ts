import z from "zod";

export const jobsTypeSchema = z.literal(["txt2img", "convert"]);

export const jobStatusSchema = z.literal([
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

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

export const logTypeSchema = z.literal(["stdout", "stderr"]);
export const logEntrySchema = z.object({
  type: logTypeSchema,
  message: z.string(),
  jobId: z.string(),
  timestamp: z.number(),
});

export const jobResultSchema = z.object({
  id: z.string(),
  type: z.literal(["log", "complete", "error"]),
  log: logEntrySchema.optional(),
  result: z.string().optional(),
});

export type JobType = z.infer<typeof jobsTypeSchema>;
export type JobStatus = z.infer<typeof jobStatusSchema>;
export type Job = z.infer<typeof jobSchema>;
export type JobResult = z.infer<typeof jobResultSchema>;
export type LogType = z.infer<typeof logTypeSchema>;
export type LogEntry = z.infer<typeof logEntrySchema>;
