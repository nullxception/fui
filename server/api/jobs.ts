import EventEmitter, { on } from "events";
import { getJob, getLogs } from "server/services/jobs";
import { jobResultSchema, type JobResult } from "server/types/jobs";

const jobEvents = new EventEmitter();

export async function* jobProcess(opts: {
  input: string;
  signal?: AbortSignal;
}) {
  const id = opts.input;
  const job = getJob(id);

  // Send existing logs
  for (const log of getLogs(id) ?? []) {
    yield jobResultSchema.parse({ type: "log", id, log });
  }

  // Send current result/error if job is done
  if (job?.result) {
    const type = job.status === "completed" ? "complete" : "error";
    yield jobResultSchema.parse({ type, id, result: job.result });
  }

  const events = on(jobEvents, "event", { signal: opts.signal });
  for await (const [data] of events) {
    const result = jobResultSchema.parse(data);
    if (result.id === id) {
      yield result;
    }
  }
}

export function emitEvent(event: JobResult) {
  jobEvents.emit("event", event);
}
