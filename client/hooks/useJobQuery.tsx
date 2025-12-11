import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "client/query";
import { usePreviewImage } from "client/stores/usePreviewImage";
import type { LogEntry } from "client/types";
import { createContext, useEffect, useRef, useState } from "react";
import type { LogData } from "server/types";
import type { JobStatus, JobType } from "server/types/jobs";
import { useLocation } from "wouter";
import { useAppStore } from "../stores/useAppStore";

interface UIJobStatus {
  id: string;
  status: JobStatus;
}

type Timeout = ReturnType<typeof setTimeout>;

export const useJobQuery = (type: JobType) => {
  const [status, setStatus] = useState<UIJobStatus | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const esRef = useRef<EventSource | null>(null);
  const [location] = useLocation();
  const rpc = useTRPC();
  const { data: listJobs } = useQuery(
    rpc.listJobs.queryOptions(type, { staleTime: 0 }),
  );
  const { setOutputTab } = useAppStore();
  const { setPreviewImage } = usePreviewImage();
  const closingRef = useRef<Timeout | null>(null);

  function addLog(log: LogEntry) {
    setLogs((prev) => [...prev, { ...log, timestamp: Date.now() }]);
  }

  useEffect(() => {
    if (
      esRef.current?.readyState === EventSource.OPEN ||
      esRef.current?.readyState === EventSource.CONNECTING
    ) {
      return;
    }
    const hasJobs = listJobs && listJobs.length > 0;
    const lastJob = hasJobs && listJobs[listJobs.length - 1];
    if (!status && lastJob && lastJob.status === "running") {
      setTimeout(() => {
        setStatus({ id: lastJob.id, status: "pending" });
      }, 60);
    }
  }, [listJobs, type, location, status]);

  useEffect(() => {
    if (!status || status.status !== "pending" || !status.id.includes("-")) {
      return;
    }

    if (esRef.current) {
      esRef.current.close();
    }
    const id = status.id;
    const es = new EventSource(`/api/jobs/${id}`);
    esRef.current = es;

    const close = (status: JobStatus) => {
      es.close();
      setStatus((prev) => ({ ...prev, id, status }));
    };

    es.addEventListener("open", () => {
      setLogs([]);
      setStatus({ id, status: "running" });
      setOutputTab("console");
    });

    es.addEventListener("message", (event) => {
      try {
        const log: LogData = JSON.parse(event.data);
        addLog({ jobId: id, message: log.message, type: log.type });
      } catch (e) {
        console.error(e);
      }
    });

    es.addEventListener("complete", (event) => {
      try {
        const result = JSON.parse(event.data);
        setStatus({ id: id, status: "completed" });
        if (typeof result === "object") {
          setPreviewImage(result);
        }
        close("completed");
      } catch (e) {
        console.error(e);
      }
    });

    es.addEventListener("error", (event) => {
      try {
        const ev = event as MessageEvent;
        if (ev.data) {
          const message = JSON.parse(ev.data);
          if (message) {
            addLog({ jobId: id, type: "stderr", message });
          }
        }
      } catch (e) {
        console.error(e);
      }
      if (!closingRef.current) {
        closingRef.current = setTimeout(() => {
          close("failed");
          closingRef.current = null;
        }, 500);
      }
    });
  }, [setOutputTab, setPreviewImage, status]);

  useEffect(() => {
    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
        setStatus(null);
      }
    };
  }, [location]);

  return {
    status,
    logs,
    addLog,
    connect(id: string) {
      if (status?.id === id && status.status === "pending") return;
      esRef.current?.close();
      esRef.current = null;
      setStatus({ id, status: "pending" });
    },
    setError(message: string) {
      setStatus((prev) => {
        addLog({ type: "stderr", message, jobId: prev?.id ?? "" });

        return { ...prev, id: prev?.id ?? "", status: "failed" };
      });
    },
  };
};

export const JobQueryContext = createContext<ReturnType<typeof useJobQuery>>({
  status: null,
  logs: [],
  setError: () => {},
  addLog: () => {},
  connect: () => {},
});

export function JobQueryProvider({
  type,
  children,
}: {
  type: JobType;
  children: React.ReactNode;
}) {
  const jq = useJobQuery(type);
  return <JobQueryContext value={jq}>{children}</JobQueryContext>;
}
