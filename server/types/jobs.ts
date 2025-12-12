import z from "zod";
import type { SDImage } from "./image";

export const jobsTypeSchema = z.literal(["txt2img", "convert"]);
export type JobType = z.infer<typeof jobsTypeSchema>;
export type JobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface Job {
  id: string;
  status: JobStatus;
  type: JobType;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: SDImage | string;
  logs: LogData[];
}

export interface LogData {
  type: "stdout" | "stderr";
  message: string;
}
