import { TRPCError } from "@trpc/server";
import { spawn } from "bun";
import path from "path";
import { CHECKPOINT_DIR } from "server/dirs";
import type { ConvertParams, LogType } from "server/types";
import { addJobLog, getJob, updateJob } from "./jobs";
import { processLog, resolveSD } from "./utils";

export async function startQuantization(id: string, params: ConvertParams) {
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
    addJobLog("convert", { id, type, message, timestamp: Date.now() });
  };

  const exec = await resolveSD();
  sendLog("stdout", `Starting conversion: ${exec.sd} ${args.join(" ")}`);

  try {
    const proc = spawn({
      cmd: [exec.sd, ...args],
      cwd: exec.cwd,
      stdout: "pipe",
      stderr: "pipe",
    });

    updateJob({ id, status: "running", process: proc });
    if (proc.exitCode != null) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Process spawn failed (${proc.exitCode})`,
      });
    }

    const textDecoder = new TextDecoder();
    const reader = proc.stdout.getReader();
    const errReader = proc.stderr.getReader();
    const stdoutPromise = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const data = textDecoder.decode(value);
        processLog(data).forEach((it) => sendLog("stdout", it));
      }
    };

    let errTimeout: NodeJS.Timeout;
    const errors: string[] = [];
    const stderrPromise = async () => {
      while (true) {
        const { done, value } = await errReader.read();
        if (done) break;
        const data = textDecoder.decode(value);
        processLog(data).forEach((it) => errors.push(it));
        if (errTimeout) {
          clearTimeout(errTimeout);
        }
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

    await Promise.allSettled([stdoutPromise(), stderrPromise()]);
    const code = await proc.exited;
    if (getJob(id)?.result?.endsWith("cancelled")) {
      // no need to report any further
      return;
    }

    if (code === 0) {
      updateJob({ id, status: "complete", result: outputPath });
    } else {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Quantization failed with exit code: ${code}`,
        cause: errors.join("\n"),
      });
    }
  } catch (e) {
    const msg =
      e instanceof Error ? [e.message, e.cause].join("\n") : String(e);
    updateJob({ id, status: "error", result: msg });
  }
}
