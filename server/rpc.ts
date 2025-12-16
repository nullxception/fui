import { initTRPC } from "@trpc/server";
import { createBunHttpHandler } from "trpc-bun-adapter";
import z, { ZodError } from "zod";
import { uploadBackground } from "./api/background";
import {
  readConfig,
  saveAppSettings,
  saveDiffusionParams,
  savePromptAttachment,
} from "./api/config";
import { quantizationStart } from "./api/converter";
import { diffusionStart, listDiffusionModels } from "./api/diffusion";
import { listImages, removeImages } from "./api/gallery";
import system from "./api/system";
import { getJobs, getRecentJob, stopJob } from "./services/jobs";
import { diffusionParamsSchema } from "./types/diffusionparams";
import { jobsTypeSchema } from "./types/jobs";
import { promptAttachmentSchema } from "./types/promptAttachment";
import { convertParamsSchema } from "./types/quantization";
import { appSettingsSchema } from "./types/userConfig";

const t = initTRPC.create({
  errorFormatter(opts) {
    const { shape, error } = opts;
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.code === "BAD_REQUEST" && error.cause instanceof ZodError
            ? z.treeifyError(error.cause)
            : null,
      },
    };
  },
});

export const router = t.router({
  sysInfo: t.procedure.query(system.info),
  listModels: t.procedure.query(listDiffusionModels),
  config: t.procedure.query(readConfig),
  diffusionParams: t.procedure.query(
    async () => (await readConfig()).diffusion,
  ),
  saveDiffusionParams: t.procedure
    .input(diffusionParamsSchema)
    .mutation((opts) => saveDiffusionParams(opts.input)),
  settings: t.procedure.query(async () => (await readConfig()).settings),
  saveSettings: t.procedure
    .input(appSettingsSchema)
    .mutation((opts) => saveAppSettings(opts.input)),
  promptAttachment: t.procedure.query(
    async () => (await readConfig()).promptAttachment,
  ),
  savePromptAttachment: t.procedure
    .input(z.array(promptAttachmentSchema))
    .mutation((opts) => savePromptAttachment(opts.input)),
  listImages: t.procedure
    .input(z.object({ limit: z.number(), cursor: z.number().optional() }))
    .query((opts) => listImages(opts.input.limit, opts.input.cursor)),
  recentJob: t.procedure
    .input(jobsTypeSchema)
    .query((opts) => getRecentJob(opts.input)),
  listJobs: t.procedure
    .input(jobsTypeSchema)
    .query((opts) => getJobs(opts.input)),
  removeImage: t.procedure
    .input(z.array(z.string()))
    .mutation((opts) => removeImages(opts.input)),
  updateBackground: t.procedure
    .input(z.instanceof(FormData).optional())
    .mutation((opts) => uploadBackground(opts.input)),
  startDiffusion: t.procedure
    .input(diffusionParamsSchema)
    .mutation((opts) => diffusionStart(opts.input)),
  stopDiffusion: t.procedure
    .input(z.string())
    .mutation((opts) => stopJob(opts.input)),
  startQuantization: t.procedure
    .input(convertParamsSchema)
    .mutation((opts) => quantizationStart(opts.input)),
  stopQuantization: t.procedure
    .input(z.string())
    .mutation((opts) => stopJob(opts.input)),
});

export type AppRouter = typeof router;

export function handleRPC(
  request: Bun.BunRequest<"/rpc/*">,
  server: Bun.Server<undefined>,
) {
  const handler = createBunHttpHandler({
    endpoint: "/rpc",
    router,
    emitWsUpgrades: false,
    batching: { enabled: true },
  });

  return handler(request, server) ?? new Response("Not found", { status: 404 });
}
