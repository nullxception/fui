import { randomUUIDv7, type Subprocess } from "bun";
import { EventEmitter } from "events";
import type { Job, JobStatus, LogEntry } from "server/types";
import { jobSchema, type JobType } from "server/types/jobs";
import db from "../db";

const jobEvents = new EventEmitter();
const activeProcesses = new Map<string, Subprocess>();

const insertJob = db.query(`
  INSERT INTO jobs (id, type, status, createdAt)
  VALUES ($id, $type, $status, $createdAt)
`);

const selectJob = db.query(`SELECT * FROM jobs WHERE id = $id`);
const selectJobsByType = db.query(
  `SELECT * FROM jobs WHERE type = $type ORDER BY createdAt DESC`,
);
const selectRecentJobByType = db.query(
  `SELECT * FROM jobs WHERE type = $type ORDER BY createdAt DESC LIMIT 1`,
);
const updateStatus = db.query(`
  UPDATE jobs 
  SET status = $status, startedAt = $startedAt, completedAt = $completedAt, result = $result
  WHERE id = $id
`);

const deleteJobByResult = db.query(
  `DELETE FROM jobs WHERE type = $type and result LIKE $pattern`,
);

const deleteOldJobs = db.query(`DELETE FROM jobs WHERE completedAt < $cutoff`);

const logs = new Map<string, LogEntry[]>();

export function createJob(type: JobType, id?: string) {
  const job: Job = {
    id: id ?? randomUUIDv7(),
    type,
    status: "pending",
    createdAt: Date.now(),
  };

  insertJob.run({
    id: job.id,
    type: job.type,
    status: job.status,
    createdAt: job.createdAt,
  });

  return job;
}

export const getJob = (id: string) => {
  return jobSchema.safeParse(selectJob.get({ id })).data;
};

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
  result?: string;
}) {
  if (status === "running" && process) {
    activeProcesses.set(id, process);
  }

  if (["completed", "failed", "cancelled"].includes(status)) {
    const proc = activeProcesses.get(id);
    if (proc) {
      if (!proc.killed) {
        console.log(`closing job ${id}`);
        proc.kill();
      }
      activeProcesses.delete(id);
    }
  }

  const job = getJob(id);
  if (!job) return;

  const finished = ["completed", "failed", "cancelled"];
  let completedAt: number | null = null;
  let startedAt: number | null = job.startedAt || null;

  if (status === "running" && !startedAt) {
    startedAt = Date.now();
  }

  if (finished.includes(status)) {
    completedAt = Date.now();
    const event = status === "completed" ? "complete" : "error";
    if (jobEvents.listenerCount(event) > 0) {
      jobEvents.emit(event, { jobId: id, data: result });
    }
  }

  updateStatus.run({
    id,
    status,
    startedAt,
    completedAt,
    result: result ? result : null,
  });
}

export function addJobLog(type: JobType, log: LogEntry) {
  const job = getJob(log.jobId);
  if (!job) {
    createJob(type, log.jobId);
  }

  logs.set(log.jobId, [...(logs.get(log.jobId) ?? []), log]);
  jobEvents.emit("log", log);
}

export function getJobs(type: JobType) {
  return selectJobsByType.all({ type }).reduce((result: Job[], job) => {
    const parsed = jobSchema.safeParse(job).data;
    return parsed ? [...result, parsed] : result;
  }, new Array<Job>());
}

export function getRecentJob(type: JobType) {
  return jobSchema.safeParse(selectRecentJobByType.get({ type }))?.data;
}

export function getLogs(id: string) {
  return logs.get(id);
}

export function removeJob(type: JobType, resultPart: string) {
  deleteJobByResult.run({ type, pattern: `%${resultPart}%` });
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
  const cutoff = Date.now() - maxAge;
  deleteOldJobs.run({ cutoff });
}
