import { TRPCError } from "@trpc/server";
import { startQuantization } from "server/services/converter";
import { createJob } from "server/services/jobs";
import type { ConvertParams } from "server/types";

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
