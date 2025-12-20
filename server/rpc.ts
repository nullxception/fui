import { initTRPC } from "@trpc/server";
import { createBunHttpHandler } from "trpc-bun-adapter";
import z, { ZodError } from "zod";
import { uploadBackground } from "./api/background";
import {
  batchSaveDiffusion,
  readConfig,
  saveAppSettings,
  saveDiffusion,
  savePromptAttachment,
} from "./api/config";
import { quantizationStart } from "./api/converter";
import { diffusionStart, listDiffusionModels } from "./api/diffusion";
import { getImagesInfo, listImages, removeImages } from "./api/gallery";
import system from "./api/system";
import { getRecentJob, stopJob } from "./services/jobs";
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
  info: t.router({
    sys: t.procedure.query(system.info),
    models: t.procedure.query(listDiffusionModels),
    lastJob: t.procedure
      .input(jobsTypeSchema)
      .query((opts) => getRecentJob(opts.input)),
  }),
  conf: t.router({
    diffusion: t.procedure
      .input(diffusionParamsSchema.keyof())
      .query(async (opt) => ({
        [opt.input]: (await readConfig()).diffusion[opt.input],
      })),
    saveDiffusion: t.procedure
      .input(
        z.object({
          paramKey: diffusionParamsSchema.keyof(),
          paramValue: z.union([
            z.string(),
            z.number(),
            z.boolean(),
            z.undefined(),
          ]),
        }),
      )
      .mutation((opts) =>
        saveDiffusion(opts.input.paramKey, opts.input.paramValue),
      ),
    batchSaveDiffusion: t.procedure
      .input(diffusionParamsSchema.partial())
      .mutation((opts) => batchSaveDiffusion(opts.input)),
    settings: t.procedure
      .input(appSettingsSchema.keyof())
      .query(async (opt) => ({
        [opt.input]: (await readConfig()).settings[opt.input],
      })),
    saveSettings: t.procedure
      .input(
        z.object({
          paramKey: appSettingsSchema.keyof(),
          paramValue: z.union([z.string(), z.number(), z.undefined()]),
        }),
      )
      .mutation((opts) =>
        saveAppSettings(opts.input.paramKey, opts.input.paramValue),
      ),
    updateBackground: t.procedure
      .input(z.instanceof(FormData).optional())
      .mutation((opts) => uploadBackground(opts.input)),
    promptAttachments: t.procedure.query(
      async () => (await readConfig()).promptAttachment,
    ),
    savePromptAttachments: t.procedure
      .input(z.array(promptAttachmentSchema))
      .mutation((opts) => savePromptAttachment(opts.input)),
  }),
  txt2img: t.router({
    start: t.procedure.mutation(async () => {
      const config = await readConfig();
      return diffusionStart(config.diffusion);
    }),
    stop: t.procedure.input(z.string()).mutation((opts) => stopJob(opts.input)),
  }),
  quantization: t.router({
    start: t.procedure
      .input(convertParamsSchema)
      .mutation((opts) => quantizationStart(opts.input)),
    stop: t.procedure.input(z.string()).mutation((opts) => stopJob(opts.input)),
  }),
  images: t.router({
    byUrls: t.procedure
      .input(z.array(z.string()))
      .query((opts) => getImagesInfo(opts.input)),
    bygPage: t.procedure
      .input(z.object({ limit: z.number(), cursor: z.number().optional() }))
      .query((opts) => listImages(opts.input.limit, opts.input.cursor)),
    remove: t.procedure
      .input(z.array(z.string()))
      .mutation((opts) => removeImages(opts.input)),
  }),
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
