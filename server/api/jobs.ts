import EventEmitter, { on } from "events";
import { getJob, getLogs } from "server/services/jobs";
import { logEntrySchema, type LogEntry } from "server/types/jobs";

const jobEvents = new EventEmitter();

export async function* jobProcess(id: string, signal?: AbortSignal) {
  const job = getJob(id);

  // Send existing logs
  for (const log of getLogs(id) ?? []) {
    yield log;
  }

  // Send current result/error if job is done
  if (job?.result) {
    yield logEntrySchema.parse({
      id,
      type: job.status === "error" ? "stderr" : "result",
      message: job.result,
      timestamp: job.completedAt ?? Date.now(),
    });
    return;
  }

  const events = on(jobEvents, "event", { signal });
  for await (const [data] of events) {
    const log = logEntrySchema.parse(data);
    if (log.id === id) {
      yield log;
    }
  }
}

export function emitEvent(event: LogEntry) {
  jobEvents.emit("event", event);
}
