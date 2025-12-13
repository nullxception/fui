import { TRPCError } from "@trpc/server";
import { spawn } from "bun";
import path from "path";
import { CHECKPOINT_DIR } from "server/dirs";
import { filterLogs, resolveSD } from "server/services/diffusion";
import {
  addJobLog,
  createJob,
  getJob,
  updateJobStatus,
} from "server/services/jobs";
import type { ConvertParams, LogType } from "server/types";

export async function quantizationStart(params: ConvertParams) {
  if (!params.model) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Model is required",
    });
  }
  if (!params.output) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Output filename is required",
    });
  }
  if (!params.type) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Type is required",
    });
  }

  try {
    const job = createJob("convert");
    startQuantization(job.id, params);
    return { jobId: job.id };
  } catch (error) {
    console.error("Error parsing request body:", error);
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Error starting quantization",
      cause: error,
    });
  }
}

export async function startQuantization(jobId: string, params: ConvertParams) {
  const modelPath = path.join(CHECKPOINT_DIR, params.model);
  const outputPath = path.join(CHECKPOINT_DIR, params.output);

  const args = [
    "-M",
    "convert",
    "-m",
    modelPath,
    "--type",
    params.type,
    "-o",
    outputPath,
    "--verbose",
  ];

  const sendLog = (type: LogType, message: string) => {
    if (type === "stderr") {
      console.error(message);
    } else {
      console.log(message);
    }
    addJobLog("txt2img", { type, message, jobId, timestamp: Date.now() });
  };

  const exec = await resolveSD();
  console.log(`Starting conversion: ${exec.sd} ${args.join(" ")}`);

  const proc = spawn({
    cmd: [exec.sd, ...args],
    cwd: exec.cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  updateJobStatus({ id: jobId, status: "running", process: proc });

  // Check for errors related to process creation
  if (proc.exitCode != null) {
    updateJobStatus({
      id: jobId,
      status: "failed",
      result: `Process spawn failed (${proc.exitCode})`,
    });
    return;
  }

  const textDecoder = new TextDecoder();
  const stdoutReader = proc.stdout.getReader();

  const readStdout = async () => {
    while (true) {
      const { done, value } = await stdoutReader.read();
      if (done) break;
      const data = textDecoder.decode(value);
      data
        .split(/\n|\x1b\[K.*/)
        .map((line) => line.trim())
        .filter((line) => line.length > 1)
        .forEach((log) => sendLog("stdout", filterLogs(log)));
    }
  };

  const stderrReader = proc.stderr.getReader();
  let errTimeout: NodeJS.Timeout;
  const readStderr = async () => {
    while (true) {
      const { done, value } = await stderrReader.read();
      if (done) break;
      const data = textDecoder.decode(value);
      sendLog("stderr", data);
      if (!errTimeout) {
        errTimeout = setTimeout(() => {
          if (!proc.exited) {
            proc.kill("SIGTERM");
            proc.kill("SIGKILL");
          }
        }, 500);
      }
    }
  };

  const stdoutPromise = readStdout();
  const stderrPromise = readStderr();

  // Wait for the process to complete and get the exit code
  // Bun's Subprocess has an .exited property which is a Promise<number>
  try {
    const code = await proc.exited;

    // Wait for all stream reading to finish
    await Promise.allSettled([stdoutPromise, stderrPromise]);
    const job = getJob(jobId);
    if (code === 0) {
      updateJobStatus({
        id: jobId,
        status: "completed",
        result: outputPath,
      });
    } else if (job?.status !== "cancelled") {
      updateJobStatus({
        id: jobId,
        status: "failed",
        result: `Quantization failed with exit code: ${code}`,
      });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    updateJobStatus({
      id: jobId,
      status: "failed",
      result: `Process error: ${msg}`,
    });
  }
}
