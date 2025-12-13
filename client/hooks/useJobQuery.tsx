import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "client/query";
import { usePreviewImage } from "client/stores/usePreviewImage";
import { createContext, useEffect, useRef, useState } from "react";
import type { JobStatus, JobType, LogEntry } from "server/types";
import { logEntrySchema } from "server/types/jobs";
import { useLocation } from "wouter";
import z from "zod";
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
  const queryClient = useQueryClient();

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
    const recentJob = hasJobs && listJobs[0];
    if (!status && recentJob && recentJob.status === "running") {
      setTimeout(() => {
        setStatus({ id: recentJob.id, status: "pending" });
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
        addLog(logEntrySchema.parse(JSON.parse(event.data)));
      } catch (e) {
        console.error(e);
      }
    });

    es.addEventListener("complete", async (event) => {
      try {
        const images = rpc.listImages.infiniteQueryKey();
        await queryClient.invalidateQueries({ queryKey: images });

        setStatus({ id: id, status: "completed" });
        setPreviewImage(z.string().parse(event.data));
        close("completed");
      } catch (e) {
        console.error(e);
      }
    });

    es.addEventListener("error", (event: MessageEvent) => {
      try {
        addLog({
          jobId: id,
          type: "stderr",
          message: z.string().parse(event.data),
          timestamp: Date.now(),
        });
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
  }, [queryClient, rpc.listImages, setOutputTab, setPreviewImage, status]);

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
        addLog({
          type: "stderr",
          message,
          jobId: prev?.id ?? "",
          timestamp: Date.now(),
        });

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
