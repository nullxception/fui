import { TRPCError } from "@trpc/server";
import { spawn } from "bun";
import path from "path";
import {
  CHECKPOINT_DIR,
  EMBEDDING_DIR,
  LLM_DIR,
  LORA_DIR,
  OUTPUT_DIR,
  TEXT_ENCODER_DIR,
  UPSCALER_DIR,
  VAE_DIR,
} from "server/dirs";
import type { DiffusionParams, LogType } from "server/types";
import z from "zod";
import { addJobLog, getJob, updateJob } from "./jobs";
import { processLog, resolveSD } from "./utils";

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

  if (params.clipOnCpu) {
    args.push("--clip-on-cpu");
  }

  if (params.vaeOnCpu) {
    args.push("--vae-on-cpu");
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

  try {
    const proc = spawn({
      cmd: [exec.sd, ...args.map((x) => x.toString())],
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
        errTimeout = setTimeout(() => {
          if (!proc.exited) {
            proc.kill("SIGTERM");
            proc.kill("SIGKILL");
          }
        }, 500);
      }
    };

    await Promise.allSettled([stdoutPromise(), stderrPromise()]);
    const code = await proc.exited;
    if (getJob(id)?.result?.endsWith("cancelled")) {
      // no need to report any further
      return;
    }

    if (code === 0) {
      let result = path.join("/output", "txt2img", `${outputName}.png`);
      if (params.batchMode && batchSize.success) {
        const resultFiles = [outputName];
        for (let i = 2; i <= batchSize.data; i++) {
          resultFiles.push(`${outputName}_${i}`);
        }
        result = resultFiles
          .map((f) => path.join("/output", "txt2img", `${f}.png`))
          .join(",");
      }
      updateJob({ id, status: "complete", result });
    } else {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Diffusion failed with exit code: ${code}`,
        cause: errors.join("\n"),
      });
    }
  } catch (e) {
    const msg =
      e instanceof Error ? [e.message, e.cause].join("\n") : String(e);
    updateJob({ id, status: "error", result: msg });
  }
}
