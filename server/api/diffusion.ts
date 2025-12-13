import { TRPCError } from "@trpc/server";
import { Glob } from "bun";
import path from "path";

import {
  CHECKPOINT_DIR,
  EMBEDDING_DIR,
  LLM_DIR,
  LORA_DIR,
  MODELS_DIR,
  TEXT_ENCODER_DIR,
  UPSCALER_DIR,
  VAE_DIR,
} from "server/dirs";
import { startDiffusion } from "server/services/diffusion";
import {
  createJob,
  getJob,
  getLogs,
  withJobEvents,
} from "server/services/jobs";
import type { DiffusionParams, LogEntry, Models } from "server/types";

function putModelFiles(
  file: string,
  subdir: string,
  target: string[],
  match?: RegExp,
) {
  const ext = match ? match : /.*\.(ckpt|safetensors|sft|pth|gguf)$/;
  if (!ext.test(file)) return;
  if (file.startsWith(subdir + path.sep)) {
    target.push(path.relative(subdir, file));
  }
}

export async function listDiffusionModels() {
  try {
    const glob = new Glob("**/*");
    const models: Models = {
      checkpoints: [],
      embeddings: [],
      loras: [],
      vaes: [],
      upscalers: [],
      llms: [],
      textEncoders: [],
    };

    const rCheckpoint = path.relative(MODELS_DIR, CHECKPOINT_DIR);
    const rEmbedding = path.relative(MODELS_DIR, EMBEDDING_DIR);
    const rLora = path.relative(MODELS_DIR, LORA_DIR);
    const rVae = path.relative(MODELS_DIR, VAE_DIR);
    const rUpscaler = path.relative(MODELS_DIR, UPSCALER_DIR);
    const rLlm = path.relative(MODELS_DIR, LLM_DIR);
    const rTextEncoder = path.relative(MODELS_DIR, TEXT_ENCODER_DIR);

    for await (const file of glob.scan(MODELS_DIR)) {
      putModelFiles(file, rCheckpoint, models.checkpoints);
      putModelFiles(file, rEmbedding, models.embeddings);
      putModelFiles(file, rLora, models.loras);
      putModelFiles(file, rVae, models.vaes);
      putModelFiles(file, rUpscaler, models.upscalers);
      putModelFiles(file, rLlm, models.llms);
      putModelFiles(file, rTextEncoder, models.textEncoders);
    }

    return models;
  } catch (error) {
    console.error("Error reading models directory:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to list models",
      cause: error,
    });
  }
}

export async function diffusionStart(params: DiffusionParams) {
  if (!params.model) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Model is required",
    });
  }

  try {
    const job = createJob("txt2img");
    startDiffusion(job.id, params);
    return { jobId: job.id };
  } catch (error) {
    console.error("Error parsing request body:", error);
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Error starting diffusion",
      cause: error,
    });
  }
}

export const diffusionProgress: Bun.Serve.Handler<
  Bun.BunRequest<"/api/jobs/:id">,
  Bun.Server<undefined>,
  Response
> = async (req: Bun.BunRequest<"/api/jobs/:id">) => {
  const jobId = req.params.id;

  if (!jobId) {
    return Response.json({ error: "Job ID is required" }, { status: 400 });
  }

  const job = getJob(jobId);
  if (!job) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const sendEvent = (event: string, data: unknown) => {
        try {
          data = typeof data === "string" ? data : JSON.stringify(data);
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${data}\n\n`),
          );
        } catch {
          // Controller might be closed
        }
      };

      // Send existing logs
      getLogs(jobId)?.forEach((log) => {
        sendEvent("message", log);
      });

      // Send current result/error if job is done
      if (job.result) {
        sendEvent(
          Object.keys(job.result).includes("success") ? "completed" : "error",
          job.result,
        );
      }

      // Subscribe to new logs
      const onLog = (log: LogEntry) => {
        if (log.jobId === jobId) {
          sendEvent("message", log);
        }
      };

      const onComplete = ({
        jobId: id,
        data,
      }: {
        jobId: string;
        data: string;
      }) => {
        if (id === jobId) {
          sendEvent("complete", data);
        }
      };

      const onError = ({
        jobId: id,
        data,
      }: {
        jobId: string;
        data: string;
      }) => {
        if (id === jobId) {
          sendEvent("error", data);
        }
      };

      withJobEvents((events) => {
        events.on("log", onLog);
        events.on("complete", onComplete);
        events.on("error", onError);

        // Cleanup on close
        req.signal.addEventListener("abort", () => {
          events.off("log", onLog);
          events.off("complete", onComplete);
          events.off("error", onError);
          try {
            controller.close();
          } catch {
            // Ignore
          }
        });
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
};
