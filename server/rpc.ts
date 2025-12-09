import { initTRPC } from "@trpc/server";
import { createBunHttpHandler } from "trpc-bun-adapter";
import z from "zod";
import { uploadBackground } from "./api/background";
import {
  readConfig,
  saveAppSettings,
  saveDiffusionParams,
  saveTriggerWords,
} from "./api/config";
import { convertWeights } from "./api/converter";
import {
  diffusionJobs,
  diffusionStart,
  listDiffusionModels,
} from "./api/diffusion";
import { listImages, removeImages } from "./api/gallery";
import system from "./api/system";
import { stopJob } from "./services/jobs";
import { diffusionParamsSchema } from "./types/diffusionparams";
import { convertParamsSchema } from "./types/quantization";
import { triggerWordSchema } from "./types/triggerword";
import { appSettingsSchema } from "./types/userconfig";

const t = initTRPC.create();

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
  triggerWords: t.procedure.query(
    async () => (await readConfig()).triggerWords,
  ),
  saveTriggerWords: t.procedure
    .input(z.array(triggerWordSchema))
    .mutation((opts) => saveTriggerWords(opts.input)),
  listImages: t.procedure
    .input(z.object({ limit: z.number(), cursor: z.number().optional() }))
    .query((opts) => listImages(opts.input.limit, opts.input.cursor)),
  listJobs: t.procedure.query(diffusionJobs),
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
  convertModel: t.procedure
    .input(convertParamsSchema)
    .mutation((opts) => convertWeights(opts.input)),
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
