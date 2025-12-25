import { useAppStore } from "@/hooks/useAppStore";
import { JobQueryContext } from "@/hooks/useJobQuery";
import { motion } from "motion/react";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import type { LogEntry } from "server/types";
import type { LogProgress } from "server/types/jobs";
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
const LogProgressBar = React.memo(({ progress }: { progress: LogProgress }) => {
  return (
    <div className="relative flex w-full flex-row items-center-safe justify-center gap-2">
      <Progress
        value={progress.percentage}
        className="h-2 grow"
        indicatorClassName="bg-foreground/40"
      />
      <span className="text-nowrap text-purple-300">
        {progress.current} of {progress.total}
      </span>
      <span className="text-nowrap text-blue-300">({progress.speed})</span>
    </div>
  );
});

const ConsoleLog = React.memo(({ log }: { log: LogEntry }) => {
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
        <LogProgressBar progress={log.progress} />
      ) : (
        <span className={`${log.type === "stderr" && "text-destructive"}`}>
          {data}
        </span>
      )}
    </motion.div>
  ));
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
    const result: Array<LogEntry> = [];
    let lastProgressIndex = -1;
    logs
      ?.filter((x) => x.id === job?.id && typeof x.message === "string")
      ?.forEach((log) => {
        if (log.progress) {
          const last = result[lastProgressIndex];
          if (lastProgressIndex >= 0 && last) {
            result[lastProgressIndex] = log;
            return;
          }
        }
        result.push(log);
        lastProgressIndex = (log.progress ? result.length : 0) - 1;
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
