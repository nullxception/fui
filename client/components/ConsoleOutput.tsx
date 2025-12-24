import { useAppStore } from "@/hooks/useAppStore";
import { JobQueryContext } from "@/hooks/useJobQuery";
import { motion } from "motion/react";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import type { LogEntry } from "server/types";
import { useShallow } from "zustand/react/shallow";
import { Progress } from "./ui/progress";

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString();
}

const AnimationSettings = {
  initial: { opacity: 0, x: -100 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -100 },
};

function isAtBottom(el: HTMLElement, threshold = 100) {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
}

function ConsoleTime({
  time,
  className = "",
}: {
  time: number;
  className?: string;
}) {
  const { show } = useAppStore(useShallow((s) => ({ show: s.showLogsTime })));
  return (
    <span
      className={`text-muted-foreground select-none ${!show && "hidden"} ${className}`}
    >
      {time && `[${formatTime(time)}]`}
    </span>
  );
}

interface LogProgress {
  current: number;
  total: number;
  percentage: number;
  speed: string;
}

interface LogWithProgress extends LogEntry {
  progress?: LogProgress;
}

const ConsoleLog = React.memo(({ log }: { log: LogWithProgress }) => {
  const logs = log.message.split("\n");
  return logs.map((data, i) => (
    <motion.div
      key={i}
      transition={{ duration: 0.2 }}
      initial={{ opacity: 0, filter: "blur(3px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      className="flex flex-row gap-2 py-px"
    >
      <ConsoleTime time={log.timestamp} className="text-nowrap" />
      {log.progress ? (
        <>
          <div className="flex w-full flex-row items-center">
            <Progress
              value={log.progress.percentage}
              className="h-2 grow"
              indicatorClassName="bg-foreground/40"
            />
          </div>
          <span className="text-nowrap">{log.progress.speed}</span>
        </>
      ) : (
        <span className={`${log.type === "stderr" && "text-destructive"}`}>
          {data}
        </span>
      )}
    </motion.div>
  ));
});

function parseProgress(text: string): LogProgress | undefined {
  const match = text.match(/\|.*\|\s*(\d+)\/(\d+)\s-\s(.*\/.*)/);
  if (!match) return;
  const [, lineCurrent, lineTotal, speed] = match;
  const current = parseInt(lineCurrent ?? "1");
  const total = parseInt(lineTotal ?? "1");
  const percentage = 100 * (current / total);
  return { current, total, percentage, speed: speed ?? "-it/s" };
}

export function ConsoleOutput({ className }: { className?: string }) {
  const { job, logs } = useContext(JobQueryContext);
  const consoleRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const rafId = useRef<number | null>(null);
  useEffect(() => {
    const el = consoleRef.current;
    if (!el) return;

    let last = autoScroll;

    const onScroll = () => {
      const next = isAtBottom(el);
      if (next !== last) {
        last = next;
        setAutoScroll(next);
      }
    };

    el.addEventListener("scroll", onScroll);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      el.removeEventListener("scroll", onScroll);
    };
  }, [autoScroll]);

  useEffect(() => {
    if (!autoScroll) return;
    const el = consoleRef.current;
    if (!el) return;

    if (rafId.current) cancelAnimationFrame(rafId.current);

    rafId.current = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [logs, autoScroll]);

  const processedLogs = useMemo(() => {
    const result: Array<LogWithProgress> = [];
    let lastProgressIndex = -1;

    logs
      ?.filter((x) => x.id === job?.id)
      ?.forEach((log) => {
        if (typeof log?.message !== "string") return;
        const message = log.message.trim();
        // Check if this is a progress bar line
        const isProgress = /\|=*.*\| \d+\/\d+/.test(message);

        if (isProgress) {
          const lastProg = result[lastProgressIndex];
          const progress = parseProgress(message);
          if (lastProgressIndex >= 0 && lastProg) {
            // Update the last progress line
            Object.assign(lastProg, log, { progress });
          } else {
            // Add new progress line
            result.push({ ...log, progress });
            lastProgressIndex = result.length - 1;
          }
        } else {
          // Regular log line
          result.push(log);
          lastProgressIndex = -1; // Reset progress tracking
        }
      });

    return result;
  }, [job?.id, logs]);

  return (
    <div
      className={`scrollbar-thin h-[50vh] w-full overflow-auto p-6 font-mono text-xs break-all scrollbar-thumb-secondary scrollbar-track-transparent lg:h-full ${className}`}
      ref={consoleRef}
    >
      {processedLogs.length === 0 ? (
        <motion.div
          {...AnimationSettings}
          className="text-muted-foreground italic"
        >
          Waiting for process output...
        </motion.div>
      ) : (
        processedLogs.map((log, index) => <ConsoleLog key={index} log={log} />)
      )}
    </div>
  );
}
