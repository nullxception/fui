import type { Image, Models } from "server/types";

export interface ParsedMetadata {
  prompt: string;
  negativePrompt: string;
  upscaled: boolean;
  baseWidth: number;
  baseHeight: number;
  model: string;
  steps: number;
  cfgScale: number;
  seed: number;
  rng: string;
  samplingMethod: string;
  scheduler: string;
  version: string;
  vae?: string;
  textEncoders?: string[];
}

const emptyMetadata: ParsedMetadata = {
  prompt: "",
  negativePrompt: "",
  upscaled: false,
  baseWidth: -1,
  baseHeight: -1,
  model: "",
  steps: -1,
  cfgScale: -1,
  seed: -1,
  rng: "",
  samplingMethod: "",
  scheduler: "",
  version: "",
};

function snakeToCamel(str: string) {
  return str
    .toLowerCase()
    .replace(/([-_][a-z])/g, (group) =>
      group.toUpperCase().replace("-", "").replace("_", ""),
    );
}
// --- Split by commas but ignore commas inside parentheses ---
export function splitSmart(t: string) {
  const result: string[] = [];
  let current = "";
  let depth = 0;

  for (const char of t) {
    if (char === "(") depth++;
    if (char === ")") depth--;

    if (char === "," && depth === 0) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim()) result.push(current.trim());
  return result;
}

function fixLoraPath(text: string, models?: Models): string {
  if (!models?.loras.length) {
    return text;
  }

  const validLoras = new Set(
    models.loras.map((x) => x.replace(/\.(safetensors|ckpt)$/, "")),
  );

  const loraRegex = /<lora:(.*?):[^>]*>/;
  const match = text.match(loraRegex);

  if (!match) {
    return text;
  }

  const [, currentPath] = match;

  if (currentPath && validLoras.has(currentPath)) {
    return text;
  }

  const filename = currentPath?.split("/").at(-1);

  if (!filename) {
    return text;
  }

  const properPath = models.loras
    .map((x) => x.replace(/\.(safetensors|ckpt)$/, ""))
    .find((validPath) => validPath.endsWith(filename));

  if (properPath) {
    const newTag = `<lora:${properPath}:`;
    return text.replace(/<lora:(.*?):/, newTag);
  }

  return text;
}

const normalize = (s: string) => s.replace(/\s+/g, " ").trim();

export function optimizePrompt(text?: string, models?: Models) {
  if (!text) return "";
  const chunks = text
    .split("\n")
    .flatMap(splitSmart)
    .map(normalize)
    .filter(Boolean);

  const loras: string[] = [];
  const embeds: string[] = [];
  const scores: string[] = [];
  const others: string[] = [];

  for (let chunk of chunks) {
    if (!chunk) continue;

    const loraMatches = chunk.match(/<lora:[^>]+>/g) || [];
    if (loraMatches.length) {
      loras.push(...loraMatches);
      chunk = chunk.replace(/<lora:[^>]+>/g, " ");
    }

    const embedMatches = chunk.match(/embedding:[^,\s)]+/gi) || [];
    if (embedMatches.length) {
      embeds.push(...embedMatches);
      chunk = embedMatches.reduce((acc, m) => acc.replace(m, " "), chunk);
    }

    const scoreMatches = chunk.match(/score_\d+.*/gi) || [];
    if (scoreMatches.length) {
      scores.push(...scoreMatches.sort().reverse());
      chunk = scoreMatches.reduce((acc, m) => acc.replace(m, " "), chunk);
    }

    const rest = normalize(chunk);
    if (rest) others.push(rest);
  }

  const seen = new Set<string>();
  const deduped = [
    ...loras.map((l) => fixLoraPath(l, models)),
    ...embeds,
    ...scores,
    ...others,
  ]
    .map((it) => it.trim())
    .filter((it) => {
      if (it.length === 0) return false;
      const k = it.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

  return deduped
    .join(", ")
    .replace(/(\()\s+|\s+(\))/g, (_, o, c) => o || c)
    .replace(/>\s*,\s*/g, "> ");
}

function parsePairs(
  data: ParsedMetadata,
  models: Models | undefined,
  image: Image,
  otherParams: Record<string, string | number>,
): (value: string, index: number, array: string[]) => void {
  return (pair) => {
    const [k, ...values] = pair.split(": ");
    if (!k || values.length < 1) return;
    let key = k.toLowerCase().replace(/ /g, "_").trim();
    key = snakeToCamel(key);
    const value = values.join(": ").trim();
    switch (key) {
      case "version":
        data.version = value;
        break;
      case "model":
      case "unet":
        data.model =
          models?.checkpoints.find((path) => path.endsWith(value)) ?? value;
        break;
      case "vae":
        data.vae = models?.vaes.find((path) => path.endsWith(value)) ?? value;
        break;
      case "te":
        if (data.textEncoders?.includes(value)) {
          break;
        } else {
          const encoders = data.textEncoders
            ? [...data.textEncoders, value]
            : [value];
          data.textEncoders = encoders.map(
            (enc) => models?.vaes.find((path) => path.endsWith(enc)) ?? enc,
          );
        }
        break;
      case "cfgScale":
        data.cfgScale = parseFloat(value);
        break;
      case "steps":
        data.steps = parseInt(value);
        break;
      case "size": {
        const [width, height] = value.split("x").map((d) => d.trim());

        if (width && height) {
          data.baseWidth = parseInt(width);
          data.baseHeight = parseInt(height);
        }
        if (image.width > data.baseWidth || image.height > data.baseHeight) {
          data.upscaled = true;
        }
        break;
      }
      case "sampler": {
        const [method, sched] = value.split(" ").map((s) => s.trim());
        if (method && sched) {
          data.samplingMethod = method;
          data.scheduler = sched;
        }
        break;
      }
      case "rng":
        data.rng = value;
        break;
      case "seed":
        data.seed = Number(value);
        break;
      case "guidance":
      case "eta":
        break; // Ignore for now
      default:
        otherParams[key] = value;
        break;
    }
  };
}

export function parseDiffusionParams(image?: Image, models?: Models) {
  if (!image) return emptyMetadata;
  const data: ParsedMetadata = Object.create(emptyMetadata);

  if (!image.metadata) return data;

  try {
    const lines = image.metadata.split("\n").filter((l) => l.trim() !== "");
    let prompt = "";
    let negativePrompt = "";
    const otherParams: Record<string, string | number> = {};

    let isNegative = false;
    let isParams = false;

    for (const line of lines) {
      if (line.startsWith("Negative prompt:")) {
        negativePrompt = line.replace("Negative prompt:", "").trim();
        isNegative = true;
        continue;
      }
      if (line.startsWith("Steps: ")) {
        isParams = true;
        isNegative = false; // End of negative prompt section
        const pairs = line.split(", ");
        pairs.forEach(parsePairs(data, models, image, otherParams));
        continue;
      }

      if (isNegative && !isParams) {
        negativePrompt += (negativePrompt ? "\n" : "") + line;
        continue;
      }

      if (!isNegative && !isParams) {
        prompt += (prompt ? "\n" : "") + line;
      }
    }

    data.prompt = optimizePrompt(prompt.replace(/['"]+/g, ""), models);
    data.negativePrompt = optimizePrompt(
      negativePrompt.replace(/['"]+/g, ""),
      models,
    );
    return data;
  } catch (e) {
    console.error("Failed to parse parameters", e);
    return data;
  }
}
