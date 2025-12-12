import { TRPCError } from "@trpc/server";
import { promises as fs } from "fs";
import { defaultUserConfig } from "server/defaults";
import { CONFIG_PATH } from "server/dirs";
import type {
  AppSettings,
  DiffusionParams,
  PromptAttachment,
  UserConfig,
} from "server/types";

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

export async function readConfig() {
  try {
    if (
      await fs
        .access(CONFIG_PATH)
        .then(() => true)
        .catch(() => false)
    ) {
      const file = await Bun.file(CONFIG_PATH).text();
      const conf = Bun.YAML.parse(file) as UserConfig;
      config.diffusion = conf.diffusion;
      config.settings = conf.settings;
      config.promptAttachment = conf.promptAttachment;
      return conf as UserConfig;
    } else {
      return defaultUserConfig() as UserConfig;
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

async function saveConfig(conf: UserConfig) {
  try {
    const yml = Bun.YAML.stringify(conf, null, 2);
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

export async function saveAppSettings(settings: AppSettings) {
  config.settings = getValuable(settings || {});
  return await saveConfig(config);
}

export async function savePromptAttachment(
  promptAttachment: PromptAttachment[],
) {
  config.promptAttachment = promptAttachment;
  return await saveConfig(config);
}

export async function saveDiffusionParams(params: DiffusionParams) {
  config.diffusion = getValuable(params || {});
  return await saveConfig(config);
}
