import type { UserConfig } from "./types/userconfig";

export function defaultUserConfig(): UserConfig {
  return {
    diffusion: {
      model: "",
      modelType: "full",
      seed: -1,
      clipSkip: -1,
      threads: -1,
      prompt: "",
      negativePrompt: "",
      steps: 20,
      cfgScale: 7.0,
      width: 512,
      height: 512,
    },
    settings: {
      maxWidth: 2048,
      maxHeight: 2048,
    },
    promptAttachment: [],
  };
}
