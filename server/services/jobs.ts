import { randomUUIDv7, type Subprocess } from "bun";
import { EventEmitter } from "events";
import type { Image, Job, JobStatus, LogData } from "server/types";
import type { JobType } from "server/types/jobs";

const jobEvents = new EventEmitter();
const activeProcesses = new Map<string, Subprocess>();
const jobs = new Map<string, Job>();

export function createJob(type: JobType, id?: string) {
  const job: Job = {
    id: id ?? randomUUIDv7(),
    type,
    status: "pending",
    createdAt: Date.now(),
    logs: [],
  };

  jobs.set(job.id, job);
  return job;
}

export const getJob = (id: string) => jobs.get(id);

export const withJobEvents = (predicate: (events: EventEmitter) => void) =>
  predicate(jobEvents);

export function updateJobStatus({
  id,
  status,
  process = null,
  result,
}: {
  id: string;
  status: JobStatus;
  process?: Subprocess | null;
  result?: Image | string;
}) {
  const job = jobs.get(id);

  if (status === "running" && process) {
    activeProcesses.set(id, process);
  }

  if (["completed", "failed", "cancelled"].includes(status)) {
    const process = activeProcesses.get(id);
    if (process) {
      if (!process.killed) {
        console.log(`closing job ${id}`);
        process.kill();
        process.kill("SIGTERM");
        process.kill("SIGKILL");
      }
      activeProcesses.delete(id);
    }
  }

  if (!job) return;

  job.status = status;
  const finished = ["completed", "failed", "cancelled"];
  if (finished.includes(status)) {
    job.completedAt = Date.now();
    job.result = result;
    const event = status === "completed" ? "complete" : "error";
    if (jobEvents.listenerCount(event) > 0) {
      jobEvents.emit(event, { jobId: id, data: result });
    }
  }
}

export function addJobLog(id: string, type: JobType, log: LogData) {
  let job = jobs.get(id);
  if (!job) {
    job = createJob(type, id);
  }

  job?.logs.push(log);
  jobEvents.emit("log", { jobId: id, log });
}

export function getAllJobs() {
  return jobs.values();
}

export function deleteJobByResultFile(filename: string) {
  for (const [id, job] of jobs.entries()) {
    const result = job.result;
    if (typeof result !== "string" && result?.url === filename) {
      jobs.delete(id);
    }
  }
}

export function stopJob(id?: string) {
  if (id) {
    updateJobStatus({
      id,
      status: "cancelled",
      result: `Job ${id} has been cancelled`,
    });
  }
}

export function stopJobs() {
  for (const [id] of activeProcesses.entries()) {
    stopJob(id);
  }
}
export function cleanupOldJobs(maxAge: number = 24 * 60 * 60 * 1000) {
  const now = Date.now();
  for (const [id, job] of jobs.entries()) {
    if (job.completedAt && now - job.completedAt > maxAge) {
      jobs.delete(id);
    }
  }
}
