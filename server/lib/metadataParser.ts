import type { Models, PromptAttachment } from "server/types";
import type { SDImageParams } from "server/types/image";

function snakeToCamel(str: string) {
  return str
    .toLowerCase()
    .replace(/([-_][a-z])/g, (group) =>
      group.toUpperCase().replace("-", "").replace("_", ""),
    );
}

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
  const tr = current.trim();
  if (tr) result.push(tr);
  return result;
}

export function optimizePrompt(
  text?: string,
  models?: Models,
  attachment?: PromptAttachment,
) {
  if (!text) return "";

  // Pre-calculate valid Lora paths once for performance
  const validLoras = new Set(
    models?.loras?.map((x) => x.replace(/\.(safetensors|ckpt)$/, "")),
  );
  const availableLoraPaths = models?.loras?.map((x) =>
    x.replace(/\.(safetensors|ckpt)$/, ""),
  );

  const fixLora = (tag: string): string => {
    if (!models?.loras?.length) return tag;
    const match = tag.match(/<lora:(.*?):/);
    if (!match) return tag;

    const [, name] = match;
    if (name && validLoras.has(name)) return tag;

    // Try to find the correct path by filename
    const filename = name?.split("/").pop();
    const properPath =
      filename && availableLoraPaths?.find((path) => path.endsWith(filename));

    return properPath
      ? tag.replace(`<lora:${name}:`, `<lora:${properPath}:`)
      : tag;
  };

  const record = {
    lora: [] as string[],
    embed: [] as string[],

    score: [] as string[],
    text: [] as string[],
  };

  return text
    .split("\n")
    .map((line) => {
      // Smart Split (Split by comma, ignoring parens)
      const chunks: string[] = [];
      let buffer = "",
        depth = 0;
      for (const char of line) {
        if (char === "(") depth++;
        else if (char === ")") depth--;

        if (char === "," && depth === 0) {
          if (buffer.trim()) chunks.push(buffer.trim());
          buffer = "";
        } else {
          buffer += char;
        }
      }
      if (buffer.trim()) chunks.push(buffer.trim());

      // Buckets for sorting
      const buckets = {
        lora: [] as string[],
        embed: [] as string[],
        score: [] as string[],
        text: [] as string[],
      };
      const seen = new Set<string>();

      // Process Chunks & Extract Tags
      for (let chunk of chunks) {
        chunk = chunk.replace(/<lora:[^>]+>/g, (match) => {
          const lora = fixLora(match);
          if (!record.lora.includes(lora)) {
            buckets.lora.push(lora);
            record.lora.push(lora);
          }
          return "";
        });

        chunk = chunk.replace(/embedding:[^,\s)]+/gi, (match) => {
          if (!record.embed.includes(match)) {
            buckets.embed.push(match);
            record.embed.push(match);
          }
          return "";
        });

        chunk = chunk.replace(/score_\d+.*/gi, (match) => {
          if (!record.score.includes(match)) {
            buckets.score.push(match);
            record.score.push(match);
          }
          return "";
        });

        const text = chunk.replace(/\s+/g, " ").trim();
        if (text && !record.text.includes(text)) {
          buckets.text.push(text);
          record.text.push(text);
        }
      }

      buckets.score.sort().reverse();
      if (attachment) {
        const name = attachment.target.replace(/\.(safetensors|ckpt)$/, "");
        if (attachment.type === "lora") {
          const strength = attachment.strength || 1;
          const lora = `<lora:${name}:${strength}>`;
          if (!record.lora.includes(lora)) {
            buckets.lora.push(lora);
            record.lora.push(lora);
          }
        } else {
          const embed = `embedding:${name}`;
          if (!record.embed.includes(embed)) {
            buckets.embed.push(embed);
            record.embed.push(embed);
          }
        }
        for (const word of attachment.words) {
          const text = word.replace(/\s+/g, " ").trim();
          if (text && !record.text.includes(text)) {
            buckets.text.push(text);
            record.text.push(text);
          }
        }
        // clear attachment after injected
        attachment = undefined;
      }

      return (
        [...buckets.lora, ...buckets.embed, ...buckets.score, ...buckets.text]
          .filter((item) => {
            const k = item.toLowerCase();
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          })
          .join(", ")
          // Final Formatting Cleanup
          .replace(/(\()\s+|\s+(\))/g, "$1$2")
          .replace(/,\s*([>])/g, "$1")
          .replace(/([>])[,]/g, "$1")
          .replace(/,(.)/g, ", $1")
          .replace(/\.,/g, ".")
          .replace(/\s+/g, " ")
      );
    })
    .join("\n")
    .replace(/\n{2,}/g, "\n\n") // Max 2 newlines
    .trim();
}

function parsePairs(
  data: SDImageParams,
  width: number,
  height: number,
  otherParams: Record<string, string | number>,
  models?: Models,
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
        const [parsedWidth, parsedheight] = value
          .split("x")
          .map((d) => d.trim());

        if (parsedWidth && parsedheight) {
          data.baseWidth = parseInt(parsedWidth);
          data.baseHeight = parseInt(parsedheight);
        }
        if (width > data.baseWidth || height > data.baseHeight) {
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

const emptyMetadata: SDImageParams = {
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

export function parseDiffusionParams(
  width?: number,
  height?: number,
  metadata?: string,
  models?: Models,
) {
  const data: SDImageParams = Object.create(emptyMetadata);

  if (!metadata) return data;

  try {
    const lines = metadata.split("\n").filter((l) => l.trim() !== "");
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
        pairs.forEach(
          parsePairs(data, width ?? 0, height ?? 0, otherParams, models),
        );
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
