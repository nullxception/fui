import { randomUUIDv7, type Subprocess } from "bun";
import { emitEvent } from "server/api/jobs";
import type { Job, JobStatus, LogEntry } from "server/types";
import { jobSchema, type JobType } from "server/types/jobs";
import db from "../db";

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

const deleteOldJobs = db.query(`DELETE FROM jobs WHERE completedAt < $cutoff`);

const logs = new Map<string, LogEntry[]>();

export function cleanupFailedJobs() {
  db.query(
    `DELETE FROM jobs WHERE status = "cancelled" OR status = "failed"`,
  ).run();
}

export function createJob(type: JobType, id?: string) {
  const job: Job = {
    id: id ?? randomUUIDv7(),
    type,
    status: "pending",
    createdAt: Date.now(),
  };

  cleanupFailedJobs();

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
    emitEvent({ id: id, type: event, result });
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
  emitEvent({ id: log.jobId, type: "log", log });
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

const selectJobsByResult = db.query(
  `SELECT * FROM jobs WHERE type = $type AND result LIKE $pattern`,
);
const deleteJob = db.query(`DELETE FROM jobs WHERE id = $id`);
const updateJobResult = db.query(
  `UPDATE jobs SET result = $result WHERE id = $id`,
);

export function removeJobResult(type: JobType, resultPart: string) {
  const jobs = selectJobsByResult
    .all({
      type,
      pattern: `%${resultPart}%`,
    })
    .reduce((acc: Job[], job) => {
      const parsed = jobSchema.safeParse(job).data;
      return parsed ? [...acc, parsed] : acc;
    }, []);

  for (const job of jobs) {
    if (!job.result) continue;

    const results = job.result.split(",");
    const newResults = results.filter((r) => r.trim() !== resultPart);

    if (newResults.length === 0) {
      deleteJob.run({ id: job.id });
    } else {
      updateJobResult.run({ id: job.id, result: newResults.join(",") });
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
  const cutoff = Date.now() - maxAge;
  deleteOldJobs.run({ cutoff });
}
