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
    status: "running",
    createdAt: Date.now(),
  };

  cleanupFailedJobs();
  insertJob.run(job);
  return job;
}

export const getJob = (id: string) => {
  return jobSchema.safeParse(selectJob.get({ id })).data;
};

function updateProcess(id: string, status: JobStatus, process?: Subprocess) {
  if (status === "running" && process) {
    activeProcesses.set(id, process);
    return;
  }

  if (["error", "complete"].includes(status)) {
    const proc = activeProcesses.get(id);
    console.log(`closing job ${id}`);
    proc?.kill();
    activeProcesses.delete(id);
  }
}

export function updateJob({
  id,
  status,
  result,
  process,
}: {
  id: string;
  status: JobStatus;
  result?: string;
  process?: Subprocess;
}) {
  updateProcess(id, status, process);
  const job = getJob(id);
  if (!job) return;

  let completedAt: number | null = null;
  let startedAt: number | null = job.startedAt || null;
  if (status === "running" && !startedAt) {
    startedAt = Date.now();
  }

  if (["error", "complete"].includes(status)) {
    completedAt = Date.now();
    emitEvent({
      id,
      type: status === "complete" ? "result" : "stderr",
      message: result ?? "",
      timestamp: completedAt,
    });
  }

  updateStatus.run({
    id,
    status,
    startedAt,
    completedAt,
    result: result ? result : null,
  });
}

export function parseProgress(text: string) {
  const match = text.match(/\|.*\|\s*(\d+)\/(\d+)\s-\s(.*\/.*)/);
  if (!match) return;
  const [, lineCurrent, lineTotal, speed] = match;
  const current = parseInt(lineCurrent ?? "1");
  const total = parseInt(lineTotal ?? "1");
  const percentage = 100 * (current / total);
  return { current, total, percentage, speed: speed ?? "-it/s" };
}
export function addJobLog(type: JobType, log: LogEntry) {
  const job = getJob(log.id);
  if (!job) {
    createJob(type, log.id);
  }

  if (/\|=*.*\| \d+\/\d+/.test(log.message)) {
    log.progress = parseProgress(log.message);
  }
  logs.set(log.id, [...(logs.get(log.id) ?? []), log]);
  emitEvent(log);
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
  if (!id) return;
  updateJob({
    id,
    status: "error",
    result: `Job ${id} has been cancelled`,
  });
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
