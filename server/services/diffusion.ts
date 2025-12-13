import { file, spawn } from "bun";
import { promises as fs } from "fs";
import path from "path";
import {
  CHECKPOINT_DIR,
  EMBEDDING_DIR,
  LLM_DIR,
  LORA_DIR,
  MODELS_DIR,
  OUTPUT_DIR,
  ROOT_DIR,
  TEXT_ENCODER_DIR,
  UPSCALER_DIR,
  VAE_DIR,
} from "server/dirs";
import type { DiffusionParams, LogType } from "server/types";
import { addJobLog, getJob, updateJobStatus } from "./jobs";

function printableArgs(args: (string | number)[]) {
  return args
    .map((arg) =>
      arg.toString().includes(" ")
        ? `"${arg.toString().replace(/"/g, '\\"')}"`
        : arg,
    )
    .join(" ");
}

function pad(num: number) {
  return String(num).padStart(2, "0");
}

function filename(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  const second = pad(date.getSeconds());
  return `${year}${month}${day}-${hour}${minute}${second}`;
}

function hasValue(value: string | undefined) {
  if (typeof value !== "string") return false;
  return value?.trim()?.length ?? 0 > 0;
}

function hasValidNum(
  value: number | undefined,
  { min, max, frac }: { min?: number; max?: number; frac?: number },
) {
  try {
    if (typeof value === "undefined") return [false, value] as const;
    let num = Number(value);
    if (min) {
      num = Math.max(value, min);
    }
    if (max) {
      num = Math.min(value, max);
    }

    if (frac && frac > 0) {
      let t = num.toString();
      t = t.indexOf(".") >= 0 ? t.slice(0, t.indexOf(".") + 1 + frac) : t;
      num = Number(t);
    }
    return [true, num] as const;
  } catch {
    return [false, value] as const;
  }
}

export const filterLogs = (message: string) => {
  const modelRoot = path.resolve(MODELS_DIR, "..");
  const r = String.raw`(["'\s])(${modelRoot}|${ROOT_DIR})${path.sep}`;

  return message
    .replace(/\[(\w)\w+.*\](.*)\.\wpp:(\d+)\s+-./, "")
    .replaceAll(RegExp(r, "g"), "$1");
};

export async function resolveSD() {
  // sd at project root (./bin/sd, or ./sd) or from $PATH
  const project_sd = [
    path.join(ROOT_DIR, "bin", "sd"),
    path.join(ROOT_DIR, "sd"),
  ];

  for (const psd of project_sd) {
    const f = file(psd);
    const exists = await f.exists();
    if (!exists) continue;

    const rsd = await fs.realpath(psd); // auto handle symlink case
    return { sd: rsd, cwd: path.dirname(rsd) };
  }

  return { sd: "sd", cwd: process.cwd() };
}

/**
 * Starts the diffusion process in the background.
 * @param jobId The unique job ID.
 * @params params Diffusion parameters.
 */
export async function startDiffusion(jobId: string, params: DiffusionParams) {
  const timestamp = Date.now();
  const outputFilename = `${filename(timestamp)}.png`;
  const outputPath = path.join(OUTPUT_DIR, "txt2img", outputFilename);
  const modelPath = path.join(CHECKPOINT_DIR, params.model || "");

  const positivePrompt = params.prompt ?? "";
  const negativePrompt = params.negativePrompt ?? "";
  const allPrompts = positivePrompt + negativePrompt;
  const args: (string | number)[] = [];

  if (params.modelType === "standalone") {
    args.push("--diffusion-model", modelPath);
  } else if (params.modelType === "full") {
    args.push("-m", modelPath);
  }

  if (params.quantizationType) {
    args.push("--type", params.quantizationType);
  }

  if (allPrompts.includes("embedding:")) {
    args.push("--embd-dir", EMBEDDING_DIR);
  }

  if (allPrompts.includes("lora:")) {
    args.push("--lora-model-dir", LORA_DIR);
  }

  if (hasValue(params.vae)) {
    const vaePath = path.join(VAE_DIR, params.vae || "");
    args.push("--vae", vaePath);
  }

  if (hasValue(params.upscaleModel)) {
    const upscaleModelPath = path.join(UPSCALER_DIR, params.upscaleModel || "");
    args.push("--upscale-model", upscaleModelPath);
  }

  if (hasValue(params.clipL)) {
    const clipLPath = path.join(TEXT_ENCODER_DIR, params.clipL || "");
    args.push("--clip_l", clipLPath);
  }

  if (hasValue(params.clipG)) {
    const clipGPath = path.join(TEXT_ENCODER_DIR, params.clipG || "");
    args.push("--clip_g", clipGPath);
  }

  if (hasValue(params.t5xxl)) {
    const t5xxlPath = path.join(TEXT_ENCODER_DIR, params.t5xxl || "");
    args.push("--t5xxl", t5xxlPath);
  }

  if (hasValue(params.llm)) {
    const llmPath = path.join(LLM_DIR, params.llm || "");
    args.push("--llm", llmPath);
  }

  if (hasValue(positivePrompt)) {
    args.push("-p", positivePrompt);
  }

  if (hasValue(negativePrompt)) {
    args.push("-n", negativePrompt);
  }

  if (hasValue(params.samplingMethod)) {
    args.push("--sampling-method", params.samplingMethod ?? "euler");
  }

  if (hasValue(params.scheduler)) {
    args.push("--scheduler", params.scheduler ?? "discrete");
  }

  const [hasCfgScale, cfgScale] = hasValidNum(params.cfgScale, { min: 0 });
  if (hasCfgScale) {
    args.push("--cfg-scale", cfgScale);
  }

  const [hasWidth, width] = hasValidNum(params.width, { min: 0 });
  if (hasWidth) {
    args.push("-W", width);
  }

  const [hasHeight, height] = hasValidNum(params.height, { min: 0 });
  if (hasHeight) {
    args.push("-H", height);
  }

  const [hasSteps, steps] = hasValidNum(params.steps, { min: 0 });
  if (hasSteps) {
    args.push("--steps", steps);
  }

  const [hasClipSkip, clipSkip] = hasValidNum(params.clipSkip, { min: -1 });
  if (hasClipSkip) {
    args.push("--clip-skip", clipSkip);
  }

  const [hasSeed, seed] = hasValidNum(params.seed, { min: -1 });
  if (hasSeed) {
    args.push("-s", seed);
  }

  if (params.rng) {
    args.push("--rng", params.rng);
  }

  if (params.samplerRng) {
    args.push("--sampler-rng", params.samplerRng);
  }

  if (params.diffusionFa) {
    args.push("--diffusion-fa");
  }

  if (params.diffusionConvDirect) {
    args.push("--diffusion-conv-direct");
  }

  if (params.vaeConvDirect) {
    args.push("--vae-conv-direct");
  }

  const [hasThreads, threads] = hasValidNum(params.threads, { min: -1 });
  if (hasThreads && threads > 0) {
    args.push("--threads", threads);
  }

  if (params.offloadToCpu) {
    args.push("--offload-to-cpu");
  }

  if (params.forceSdxlVaeConvScale) {
    args.push("--force-sdxl-vae-conv-scale");
  }

  args.push("-o", outputPath);

  if (params.verbose) {
    args.push("--verbose");
  }

  const sendLog = (type: LogType, message: string) => {
    if (type === "stderr") {
      console.error(message);
    } else {
      console.log(message);
    }
    addJobLog("txt2img", { type, message, jobId, timestamp: Date.now() });
  };
  const exec = await resolveSD();
  sendLog(
    "stdout",
    `Starting diffusion with command: ${exec.sd} ${printableArgs(args)}`,
  );

  const sdProcess = spawn({
    cmd: [exec.sd, ...args.map((x) => x.toString())],
    cwd: exec.cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  updateJobStatus({ id: jobId, status: "running", process: sdProcess });

  // Check for errors related to process creation
  if (sdProcess.exitCode != null) {
    updateJobStatus({
      id: jobId,
      status: "failed",
      result: `Process spawn failed (${sdProcess.exitCode})`,
    });
    return;
  }

  const textDecoder = new TextDecoder();
  const stdoutReader = sdProcess.stdout.getReader();

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

  const stderrReader = sdProcess.stderr.getReader();
  let errTimeout: NodeJS.Timeout;
  const readStderr = async () => {
    while (true) {
      const { done, value } = await stderrReader.read();
      if (done) break;
      const data = textDecoder.decode(value);
      sendLog("stderr", data);
      if (!errTimeout) {
        errTimeout = setTimeout(() => {
          if (!sdProcess.exited) {
            sdProcess.kill("SIGTERM");
            sdProcess.kill("SIGKILL");
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
    const code = await sdProcess.exited;

    // Wait for all stream reading to finish
    await Promise.allSettled([stdoutPromise, stderrPromise]);
    const job = getJob(jobId);
    if (code === 0) {
      updateJobStatus({
        id: jobId,
        status: "completed",
        result: path.join("/output", path.relative(OUTPUT_DIR, outputPath)),
      });
    } else if (job?.status !== "cancelled") {
      updateJobStatus({
        id: jobId,
        status: "failed",
        result: `Diffusion failed with exit code: ${code}`,
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
