import { useAppStore } from "@/hooks/useAppStore";
import { JobQueryContext } from "@/hooks/useJobQuery";
import { motion } from "motion/react";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import type { LogEntry } from "server/types";
import { useShallow } from "zustand/react/shallow";

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

function ConsoleTime({ time }: { time: number }) {
  const { show } = useAppStore(useShallow((s) => ({ show: s.showLogsTime })));
  return (
    <span
      className={`mr-2 text-muted-foreground select-none ${!show && "hidden"}`}
    >
      {time && `[${formatTime(time)}]`}
    </span>
  );
}

const ConsoleLog = React.memo(({ log }: { log: LogEntry }) => {
  return (
    <motion.div
      transition={{ duration: 0.2 }}
      initial={{ opacity: 0, filter: "blur(3px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      className="py-px"
    >
      <ConsoleTime time={log.timestamp} />
      {log.type === "stderr" ? (
        <span className="text-destructive">{log.message}</span>
      ) : (
        log.message
      )}
    </motion.div>
  );
});

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
    const result: Array<
      LogEntry & {
        isProgress?: boolean;
      }
    > = [];
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
          if (lastProgressIndex >= 0 && lastProg) {
            // Update the last progress line
            Object.assign(lastProg, log, { isProgress: true });
          } else {
            // Add new progress line
            result.push({ ...log, isProgress: true });
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
