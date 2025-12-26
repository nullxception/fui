import client from "@/index.html";
import { serveApp, serveStatic } from "./api/assets";
import { readConfig } from "./api/config";
import { importTags } from "./api/tagSuggestion";
import db from "./db";
import { ensureDirectories } from "./dirs";
import { handleRPC } from "./rpc";
import { cleanupFailedJobs, stopJobs } from "./services/jobs";

await ensureDirectories();
cleanupFailedJobs();
await readConfig(); // initialize config.yaml if not exists
importTags();

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

const isProd = process.env.NODE_ENV === "production";

const server = Bun.serve({
  hostname: process.env.HOST,
  port: process.env.PORT ?? 5141,
  idleTimeout: 0, // Disable timeout for long-running diffusion processes
  development: !isProd && {
    hmr: true,
    console: true,
  },
  routes: {
    "/rpc/*": handleRPC,
    "/upload/*": serveStatic, //  User-uploaded images
    "/output/*": serveStatic, // Output images
    "/*": isProd ? serveApp : client,
  },
});

console.log(`Server running at http://${server.hostname}:${server.port}`);
