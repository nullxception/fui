import { TRPCError } from "@trpc/server";
import merge from "deepmerge";
import { promises as fs } from "fs";
import { defaultUserConfig } from "server/defaults";
import { CONFIG_PATH } from "server/dirs";
import type {
  AppSettings,
  DiffusionParams,
  PromptAttachment,
  UserConfig,
} from "server/types";
import { userConfigSchema } from "server/types/userConfig";

type Valuable<T> = {
  [K in keyof T as T[K] extends null | undefined ? never : K]: T[K];
};

function getValuable<T extends object, V = Valuable<T>>(obj: T): V {
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([, v]) =>
        !(
          (typeof v === "string" && !v.length) ||
          v === null ||
          typeof v === "undefined"
        ),
    ),
  ) as V;
}

const config: UserConfig = defaultUserConfig();

function dedup(entries: PromptAttachment[]): PromptAttachment[] {
  const result: PromptAttachment[] = [];
  entries.sort((a, b) => (a.type + a.target).localeCompare(b.type + b.target));
  for (const entry of entries) {
    const prev = result[result.length - 1];
    if (prev?.target === entry.target) {
      result[result.length - 1] = merge(prev, entry, {
        arrayMerge: (dst, src) => Array.from(new Set([...dst, ...src])),
      });
      continue;
    }
    result.push(entry);
  }
  return result;
}

export async function readConfig() {
  if (config.diffusion.model.length > 1) {
    return config;
  }

  try {
    if (
      await fs
        .access(CONFIG_PATH)
        .then(() => true)
        .catch(() => false)
    ) {
      const file = await Bun.file(CONFIG_PATH).text();
      const conf = userConfigSchema.parse(
        merge(
          defaultUserConfig(),
          Bun.YAML.parse(file) as Partial<DiffusionParams>,
        ),
      );
      const mergedAttachment = dedup(conf.promptAttachment);
      config.diffusion = conf.diffusion;
      config.settings = conf.settings;
      if (mergedAttachment.length !== config.promptAttachment.length) {
        savePromptAttachment(mergedAttachment);
      } else {
        config.promptAttachment = mergedAttachment;
      }
      return config;
    } else {
      saveConfig(); // initialize config.yaml
      return config;
    }
  } catch (error) {
    console.error("Error reading config:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to read config",
      cause: error,
    });
  }
}

async function saveConfig() {
  try {
    const yml = Bun.YAML.stringify(config, null, 2);
    await Bun.write(CONFIG_PATH, yml);
    return {
      success: true,
      message: "Config saved successfully",
    };
  } catch (error) {
    console.error("Error saving config:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to save config",
      cause: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function savePromptAttachment(attachments: PromptAttachment[]) {
  config.promptAttachment = attachments;
  return await saveConfig();
}

export async function saveDiffusion<K extends keyof DiffusionParams>(
  paramKey: keyof DiffusionParams,
  value: DiffusionParams[K],
) {
  config.diffusion = { ...config.diffusion, [paramKey]: value };
  return await saveConfig();
}

export async function batchSaveDiffusion(params: Partial<DiffusionParams>) {
  config.diffusion = getValuable({ ...config.diffusion, ...params });
  return await saveConfig();
}

export async function saveAppSettings<K extends keyof AppSettings>(
  paramKey: keyof AppSettings,
  value: AppSettings[K],
) {
  config.settings = { ...config.settings, [paramKey]: value };
  return await saveConfig();
}
