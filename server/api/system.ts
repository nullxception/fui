import { TRPCError } from "@trpc/server";
import { file, spawn, version_with_sha } from "bun";
import path from "path";
import { ROOT_DIR } from "server/dirs";
import { resolveSD } from "server/services/utils";
import packageJson from "../../package.json";

async function getGitCommitHash() {
  try {
    const gitHead = await file(path.join(ROOT_DIR, ".git", "HEAD")).text();
    const ref = gitHead
      .trim()
      .split(/.*[: ]/)
      .slice(-1)[0];

    if (!ref) return;
    if (ref.indexOf("/") === -1) return ref; // HEAD detached ?
    return await file(path.join(ROOT_DIR, ".git", ref)).text();
  } catch {
    return;
  }
}

async function getAppVersion() {
  let gitHash = await getGitCommitHash();
  if (gitHash) {
    gitHash = `(${gitHash.slice(0, 7)})`;
  }
  return `${packageJson.name} v${packageJson.version} ${gitHash}`.trim();
}

export async function getSDVersion() {
  const exec = await resolveSD();
  const proc = spawn([exec.sd, "--version"], {
    cwd: exec.cwd,
    stdout: "pipe",
  });
  const stdout = await new Response(proc.stdout).text();
  try {
    const text = stdout.replace(/,/g, "").replace(/-/g, " ").trim().split(" ");
    return `${text[0]}-${text[1]} ${text[3]} (${text[5]})`;
  } catch {
    return stdout;
  }
}

async function getPhysicalCoreCount(): Promise<number | null> {
  const platform = process.platform;

  try {
    if (platform === "linux") {
      // lscpu -p=core outputs core IDs; filter out comments; count unique
      const proc = Bun.spawn([
        "bash",
        "-c",
        "lscpu -p=core | grep -v '^#' | sort -u | wc -l",
      ]);
      const output = await new Response(proc.stdout).text();
      return Number(output.trim());
    }

    if (platform === "darwin") {
      // macOS: sysctl for physical cores
      const proc = Bun.spawn(["sysctl", "-n", "hw.physicalcpu"]);
      const output = await new Response(proc.stdout).text();
      return Number(output.trim());
    }

    if (platform === "win32") {
      // Windows: WMIC
      const proc = Bun.spawn(["cmd", "/c", "WMIC CPU Get NumberOfCores"]);
      const output = await new Response(proc.stdout).text();
      const matches = output.match(/\d+/g);
      return matches ? Number(matches[0]) : null;
    }

    return null; // unsupported OS
  } catch {
    return null;
  }
}

async function info() {
  try {
    const sdVersion = await getSDVersion();
    let cpuCount = await getPhysicalCoreCount();
    if (cpuCount === null) {
      // Fallback to logical cores if physical cores detection fails
      const os = await import("os");
      cpuCount = os.cpus().length;
    }

    return {
      cpuCount,
      versions: {
        app: await getAppVersion(),
        bun: `Bun ${version_with_sha}`,
        sd: sdVersion,
      },
    };
  } catch (error) {
    console.error("Error getting system info:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to get system info",
      cause: error,
    });
  }
}

export default { info };
