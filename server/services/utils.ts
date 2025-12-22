import { file } from "bun";
import { promises as fs } from "fs";
import path from "path";
import { MODELS_DIR, ROOT_DIR } from "server/dirs";

export async function resolveSD() {
  // sd-cli at project root (./bin/sd-cli, or ./sd-cli) or from $PATH
  const project_sd = [
    path.join(ROOT_DIR, "bin", "sd-cli"),
    path.join(ROOT_DIR, "sd-cli"),
  ];

  for (const psd of project_sd) {
    const f = file(psd);
    const exists = await f.exists();
    if (!exists) continue;

    const rsd = await fs.realpath(psd); // auto handle symlink case
    return { sd: rsd, cwd: path.dirname(rsd) };
  }

  return { sd: "sd", cwd: process.cwd() };
}

function filterLog(log: string) {
  const modelRoot = path.resolve(MODELS_DIR, "..");
  const r = String.raw`(["'\s])(${modelRoot}|${ROOT_DIR})${path.sep}`;
  return log
    .replace(/\[(\w)\w+.*\](.*)\.\wpp:(\d+)\s+-./, "")
    .replaceAll(RegExp(r, "g"), "$1");
}

export function processLog(log: string) {
  return log
    .split(/\n|\x1b\[K.*/)
    .map((it) => it.trim())
    .filter((it) => it.length > 1)
    .map(filterLog);
}
