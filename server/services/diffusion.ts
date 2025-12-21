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
import z from "zod";
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

export const filterLogs = (message: string) => {
  const modelRoot = path.resolve(MODELS_DIR, "..");
  const r = String.raw`(["'\s])(${modelRoot}|${ROOT_DIR})${path.sep}`;

  return message
    .replace(/\[(\w)\w+.*\](.*)\.\wpp:(\d+)\s+-./, "")
    .replaceAll(RegExp(r, "g"), "$1");
};

export async function resolveSD() {
  // sd-cli at project root (./bin/sd-cli, or ./sd-cli) or from $PATH
  const project_sd = [
    path.join(ROOT_DIR, "bin", "sd-cli"),
    path.join(ROOT_DIR, "sd-cli"),
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
 * @param id The unique job ID.
 * @params params Diffusion parameters.
 */
export async function startDiffusion(id: string, params: DiffusionParams) {
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

  if (z.string().min(1).safeParse(params.vae).success) {
    const vaePath = path.join(VAE_DIR, params.vae || "");
    args.push("--vae", vaePath);
  }

  if (z.string().min(1).safeParse(params.upscaleModel).success) {
    const upscaleModelPath = path.join(UPSCALER_DIR, params.upscaleModel || "");
    args.push("--upscale-model", upscaleModelPath);
    const upscaleRepeats = z.number().min(2).safeParse(params.upscaleRepeats);
    if (upscaleRepeats.success) {
      args.push("--upscale-repeats", upscaleRepeats.data);
    }
    const upscaleTileSize = z.number().min(0).safeParse(params.upscaleTileSize);
    if (upscaleTileSize.success) {
      args.push("--upscale-tile-size", upscaleTileSize.data);
    }
  }

  if (z.string().min(1).safeParse(params.clipL).success) {
    const clipLPath = path.join(TEXT_ENCODER_DIR, params.clipL || "");
    args.push("--clip_l", clipLPath);
  }

  if (z.string().min(1).safeParse(params.clipG).success) {
    const clipGPath = path.join(TEXT_ENCODER_DIR, params.clipG || "");
    args.push("--clip_g", clipGPath);
  }

  if (z.string().min(1).safeParse(params.t5xxl).success) {
    const t5xxlPath = path.join(TEXT_ENCODER_DIR, params.t5xxl || "");
    args.push("--t5xxl", t5xxlPath);
  }

  if (z.string().min(1).safeParse(params.llm).success) {
    const llmPath = path.join(LLM_DIR, params.llm || "");
    args.push("--llm", llmPath);
  }

  if (z.string().min(1).safeParse(positivePrompt).success) {
    args.push("-p", positivePrompt);
  }

  if (z.string().min(1).safeParse(negativePrompt).success) {
    args.push("-n", negativePrompt);
  }

  if (z.string().min(1).safeParse(params.samplingMethod).success) {
    args.push("--sampling-method", params.samplingMethod ?? "euler");
  }

  if (z.string().min(1).safeParse(params.scheduler).success) {
    args.push("--scheduler", params.scheduler ?? "discrete");
  }

  const cfgScale = z.number().min(1).safeParse(params.cfgScale);
  if (cfgScale.success) {
    args.push("--cfg-scale", cfgScale.data);
  }

  const width = z.number().min(64).safeParse(params.width);
  if (width.success) {
    args.push("-W", width.data);
  }

  const height = z.number().min(64).safeParse(params.height);
  if (height.success) {
    args.push("-H", height.data);
  }

  const steps = z.number().min(1).safeParse(params.steps);
  if (steps.success) {
    args.push("--steps", steps.data);
  }

  const clipSkip = z.number().min(-1).safeParse(params.clipSkip);
  if (clipSkip.success) {
    args.push("--clip-skip", clipSkip.data);
  }

  const seed = z.number().min(-1).safeParse(params.seed);
  if (seed.success) {
    args.push("-s", seed.data);
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

  const threads = z.number().min(1).safeParse(params.threads);
  if (threads.success) {
    args.push("--threads", threads.data);
  }

  if (params.offloadToCpu) {
    args.push("--offload-to-cpu");
  }

  if (params.forceSdxlVaeConvScale) {
    args.push("--force-sdxl-vae-conv-scale");
  }
  const job = getJob(id);
  const outputName = filename(job?.createdAt ?? Date.now());
  const outputPath = path.join(OUTPUT_DIR, "txt2img", `${outputName}.png`);
  args.push("-o", outputPath);

  const batchSize = z.number().min(2).safeParse(params.batchCount);
  if (params.batchMode && batchSize.success) {
    args.push("--batch-count", batchSize.data);
  }

  if (params.verbose) {
    args.push("--verbose");
  }

  const sendLog = (type: LogType, message: string) => {
    if (type === "stderr") {
      console.error(message);
    } else {
      console.log(message);
    }
    addJobLog("txt2img", { type, message, id: id, timestamp: Date.now() });
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
  updateJobStatus({ id, status: "running", process: sdProcess });

  // Check for errors related to process creation
  if (sdProcess.exitCode != null) {
    updateJobStatus({
      id,
      status: "error",
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
    if (code === 0) {
      let result = path.join("/output", path.relative(OUTPUT_DIR, outputPath));

      if (params.batchMode && batchSize.success) {
        const resultFiles = [outputName];
        for (let i = 2; i <= batchSize.data; i++) {
          resultFiles.push(`${outputName}_${i}`);
        }
        result = resultFiles
          .map((f) =>
            path.join(
              "/output",
              path.relative(
                OUTPUT_DIR,
                path.join(OUTPUT_DIR, "txt2img", `${f}.png`),
              ),
            ),
          )
          .join(",");
      }
      updateJobStatus({ id, status: "complete", result });
    } else {
      updateJobStatus({
        id,
        status: "error",
        result: `Diffusion failed with exit code: ${code}`,
      });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    updateJobStatus({ id, status: "error", result: `Process error: ${msg}` });
  }
}
