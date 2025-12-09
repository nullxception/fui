import { initTRPC } from "@trpc/server";
import { createBunHttpHandler } from "trpc-bun-adapter";
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
import type {
  AppSettings,
  ConvertParams,
  DiffusionParams,
  TriggerWord,
} from "./types";

const t = initTRPC.create();

export const router = t.router({
  sysInfo: t.procedure.query(system.info),
  listModels: t.procedure.query(listDiffusionModels),
  config: t.procedure.query(readConfig),
  diffusionParams: t.procedure.query(
    async () => (await readConfig()).diffusion,
  ),
  saveDiffusionParams: t.procedure
    .input((it) => it as DiffusionParams)
    .mutation((opts) => saveDiffusionParams(opts.input)),
  settings: t.procedure.query(async () => (await readConfig()).settings),
  saveSettings: t.procedure
    .input((it) => it as AppSettings)
    .mutation((opts) => saveAppSettings(opts.input)),
  triggerWords: t.procedure.query(
    async () => (await readConfig()).triggerWords,
  ),
  saveTriggerWords: t.procedure
    .input((it) => it as Array<TriggerWord>)
    .mutation((opts) => saveTriggerWords(opts.input)),
  listImages: t.procedure
    .input((it) => it as { limit: number; cursor?: number })
    .query((opts) => listImages(opts.input.limit, opts.input.cursor)),
  listJobs: t.procedure.query(diffusionJobs),
  removeImage: t.procedure
    .input((it) => it as string[])
    .mutation((opts) => removeImages(opts.input)),
  updateBackground: t.procedure
    .input((it) => (it instanceof FormData && it) || undefined)
    .mutation((opts) => uploadBackground(opts.input)),
  startDiffusion: t.procedure
    .input((it) => it as DiffusionParams)
    .mutation((opts) => diffusionStart(opts.input)),
  stopDiffusion: t.procedure
    .input((it) => it as string)
    .mutation((opts) => stopJob(opts.input)),
  convertModel: t.procedure
    .input((it) => it as ConvertParams)
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
