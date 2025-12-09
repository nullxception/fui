import { TRPCError } from "@trpc/server";
import { spawn } from "bun";
import path from "path";
import { CHECKPOINT_DIR } from "server/dirs";
import { resolveSD } from "server/services/diffusion";
import type { ConvertParams } from "server/types";

export async function convertWeights(params: ConvertParams) {
  try {
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

    const modelPath = path.join(CHECKPOINT_DIR, params.model);
    const outputPath = path.join(CHECKPOINT_DIR, params.output);

    const args = [
      "-M",
      "convert",
      "-m",
      modelPath,
      "-o",
      outputPath,
      "--type",
      params.type,
    ];

    const exec = await resolveSD();
    console.log(`Starting conversion: ${exec.sd} ${args.join(" ")}`);

    const proc = spawn({
      cmd: [exec.sd, ...args],
      cwd: exec.cwd,
      stdout: "pipe",
      stderr: "pipe",
    });

    const textDecoder = new TextDecoder();
    let stdout = "";
    let stderr = "";

    // Read streams
    const readStream = async (
      reader: ReadableStreamDefaultReader<Uint8Array>,
      isStderr: boolean,
    ) => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = textDecoder.decode(value);
        if (isStderr) stderr += chunk;
        else stdout += chunk;
        console.log(`[Convert ${isStderr ? "ERR" : "OUT"}] ${chunk.trim()}`);
      }
    };

    await Promise.all([
      readStream(proc.stdout.getReader(), false),
      readStream(proc.stderr.getReader(), true),
      proc.exited,
    ]);

    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      throw new Error(`Conversion failed (exit code ${exitCode}): ${stderr}`);
    }

    return { success: true, message: "Conversion successful", stdout };
  } catch (error) {
    console.error("Conversion error:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error instanceof Error ? error.message : "Conversion failed",
      cause: error,
    });
  }
}
