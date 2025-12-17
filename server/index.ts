import client from "@/index.html";
import serveStatic from "./api/assets";
import { readConfig } from "./api/config";
import { diffusionProgress } from "./api/diffusion";
import db from "./db";
import { ensureDirectories } from "./dirs";
import { handleRPC } from "./rpc";
import { stopJobs } from "./services/jobs";

const PORT = process.env.PORT || 5141;

await ensureDirectories();
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

Bun.serve({
  port: PORT,
  idleTimeout: 0, // Disable timeout for long-running diffusion processes
  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
  routes: {
    "/rpc/*": handleRPC,
    "/api/jobs/:id": diffusionProgress,
    // Serve static files from public directory (user-uploaded images)
    "/upload/*": serveStatic,
    // Serve output images
    "/output/*": serveStatic,
    "/*": client,
  },
});

console.log(`Server running at http://localhost:${PORT}`);
