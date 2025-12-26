import { TRPCError } from "@trpc/server";
import * as fs from "fs";
import path from "path";
import { TextLineStream } from "server/lib/TextLineStream";
import { suggestionTagSchema, type SuggestionTag } from "server/types/tags";
import { UPLOAD_DIR } from "../dirs";

const tagsFile = path.join(UPLOAD_DIR, "tags.csv");

const state = {
  loaded: -1,
  parsed: new Array<SuggestionTag>(),
  popular: new Array<SuggestionTag>(),
};

export function getTagsStatus() {
  return {
    loaded: state.loaded,
    total: state.parsed.length,
  };
}

export async function importTags() {
  const file = Bun.file(tagsFile);
  const start = performance.now();
  state.loaded = 0;
  state.popular = [];
  state.parsed = [];

  try {
    const stream = file
      .stream()
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TextLineStream());
    for await (const chunk of stream) {
      const record = chunk.split(",");
      try {
        const tag = suggestionTagSchema.parse({
          name: record[0],
          type: record[1],
          postCount: record[2],
        });
        // let's filter out unwanted aspect ratio tags
        if (!/^(\d+:\d+|\d+)$/.test(tag.name)) {
          state.parsed.push(tag);
        }
      } catch {
        // skip it
      }
    }

    if (state.parsed.length === 0) {
      state.loaded = -1;
      return;
    }

    state.parsed.sort((a, b) => b.postCount - a.postCount);
    state.popular = state.parsed.slice(0, 1000);
    const parseTime = (performance.now() - start).toFixed();
    state.loaded = parseFloat(parseTime);
    console.log(
      `Parsed tags.csv with ${state.parsed.length} rows in ${parseTime}ms`,
    );
  } catch (e) {
    console.error(e);
    state.loaded = -1;
  }
}

export function getSuggestion(query: string, limit: number) {
  if (query.length === 0) return [];
  const part = query.trimStart().replaceAll(" ", "_");
  if (part.length === 0) return state.popular.slice(0, limit);
  const results = state.parsed
    .filter((it) => it.name.includes(part))
    ?.slice(0, limit)
    ?.map((it) => ({
      ...it,
      name: it.name.replaceAll("_", " "),
    }));
  return results ?? [];
}

export async function removeTags() {
  if (fs.existsSync(tagsFile)) {
    await Bun.file(tagsFile).delete();
  }
  state.popular = [];
  state.parsed = [];
  state.loaded = -1;
}

export async function uploadTags(formData?: FormData) {
  try {
    const file = formData?.get("csv");
    if (!file || !(file instanceof File)) {
      await removeTags();
      return;
    }

    const buffer = await file.arrayBuffer();
    const filename = "tags.csv";
    await Bun.write(tagsFile, buffer);
    await importTags();
    return {
      filename,
      url: `/upload/${filename}?t=${Date.now()}`,
    };
  } catch (error) {
    console.error("Tags processing error:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Tags processing failed",
      cause: error,
    });
  }
}
