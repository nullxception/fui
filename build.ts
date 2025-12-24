#!/usr/bin/env bun
import tailwind from "bun-plugin-tailwind";
import { existsSync } from "fs";
import { rm } from "fs/promises";
import { buildPWAIcons, copyManifest } from "libs/pwa";
import path from "path";

const outdir = path.join(process.cwd(), "dist");

if (existsSync(outdir)) {
  console.log(`Cleaning previous build at ${outdir}`);
  await rm(outdir, { recursive: true, force: true });
}

const start = performance.now();

const site = await Bun.build({
  entrypoints: ["./client/index.html", "./client/sw.ts"],
  outdir: outdir,
  plugins: [tailwind],
  minify: true,
  target: "browser",
  sourcemap: "linked",
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});
const assets = await buildPWAIcons(outdir);
const manifest = await copyManifest(outdir);

const end = performance.now();

const outputTable = [...site.outputs, ...assets, manifest].map((output) => ({
  File: path.relative(process.cwd(), output.path),
  Type: output.kind,
}));

console.table(outputTable);
const buildTime = (end - start).toFixed(2);

console.log(`Build completed in ${buildTime}ms`);
