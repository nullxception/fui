import client from "@/index.html";
import path from "path";
import serveStatic from "./api/assets";
import { readConfig } from "./api/config";
import db from "./db";
import { ensureDirectories, PUBLIC_DIR, ROOT_DIR } from "./dirs";
import { handleRPC } from "./rpc";
import { cleanupFailedJobs, stopJobs } from "./services/jobs";

const PORT = process.env.PORT || 5141;

await ensureDirectories();
cleanupFailedJobs();
await readConfig(); // initialize config.yaml if not exists

function cleanup() {
  console.log("Terminating all active jobs...");
  stopJobs();
  console.log("Closing database...");
  db.close(false);
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("SIGQUIT", cleanup);
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  cleanup();
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection at:", promise, "reason:", reason);
  cleanup();
});

async function serveDist(req: Bun.BunRequest) {
  const target = new URL(req.url).pathname;
  const dist = path.join(ROOT_DIR, "dist");
  const distFile = Bun.file(path.join(dist, target));
  if (await distFile.exists()) {
    return new Response(distFile);
  }

  const pubFile = Bun.file(path.join(PUBLIC_DIR, target));
  if (await pubFile.exists()) {
    return new Response(pubFile);
  }
  return new Response(Bun.file(path.join(dist, "index.html")));
}

const isProd = process.env.NODE_ENV === "production";

Bun.serve({
  port: PORT,
  idleTimeout: 0, // Disable timeout for long-running diffusion processes
  development: !isProd && {
    hmr: true,
    console: true,
  },
  routes: {
    "/rpc/*": handleRPC,
    "/upload/*": serveStatic, //  User-uploaded images
    "/output/*": serveStatic, // Output images
    "/*": isProd ? serveDist : client,
  },
});

console.log(`Server running at http://localhost:${PORT}`);
