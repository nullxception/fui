import type { LogEntry } from "client/types";
import { useEffect, useMemo, useRef } from "react";

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString();
}

export function ConsoleOutput({
  logs,
  className,
}: {
  logs: LogEntry[] | undefined;
  className?: string;
}) {
  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  const processedLogs = useMemo(() => {
    const result: Array<
      LogEntry & {
        isProgress?: boolean;
      }
    > = [];
    let lastProgressIndex = -1;

    logs?.forEach((log) => {
      const message = log.message.trim();
      // Check if this is a progress bar line
      const isProgress = /\|=*.*\| \d+\/\d+/.test(message);

      if (isProgress) {
        if (lastProgressIndex >= 0) {
          // Update the last progress line
          result[lastProgressIndex] = { ...log, isProgress: true };
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
  }, [logs]);

  return (
    <div
      className={`scrollbar-thin h-[50vh] w-full overflow-auto bg-background/60 p-6 font-mono text-xs break-all scrollbar-thumb-secondary scrollbar-track-transparent lg:h-full ${className}`}
      ref={consoleRef}
    >
      {processedLogs.length === 0 ? (
        <div className="text-muted-foreground italic">
          Waiting for process output...
        </div>
      ) : (
        processedLogs.map((log, index) => (
          <div key={index}>
            <span className="mr-2 text-muted-foreground select-none">
              {log.timestamp && `[${formatTime(log.timestamp)}]`}
            </span>
            <span
              className={
                log.type === "stderr" ? "text-red-400" : "text-gray-300"
              }
            >
              {log.message}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
