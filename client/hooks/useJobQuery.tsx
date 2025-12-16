import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "client/query";
import { usePreviewImage } from "client/stores/usePreviewImage";
import type { Timeout } from "client/types";
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

export const useJobQuery = (type: JobType) => {
  const [status, setStatus] = useState<UIJobStatus | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const esRef = useRef<EventSource | null>(null);
  const [location] = useLocation();
  const rpc = useTRPC();
  const { data: recentJob } = useQuery(rpc.recentJob.queryOptions(type));
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

    let active = status;
    if (!active && recentJob && recentJob.status === "running") {
      active = { id: recentJob.id, status: "pending" };
    }

    if (!active || active.status !== "pending" || !active.id.includes("-")) {
      return;
    }

    if (esRef.current) {
      esRef.current.close();
    }
    const id = active.id;
    const es = new EventSource(`/api/jobs/${id}`);
    esRef.current = es;

    const close = (status: JobStatus) => {
      es.close();
      setStatus((prev) => ({ ...prev, id, status }));
    };

    es.addEventListener("open", () => {
      setLogs([]);
      setStatus({ id, status: "running" });
      useAppStore.getState().setOutputTab("console");
    });

    es.addEventListener("message", (event) => {
      try {
        if (status?.status !== "running") {
          setStatus({ id, status: "running" });
        }
        addLog(logEntrySchema.parse(JSON.parse(event.data)));
      } catch (e) {
        console.error(e);
      }
    });

    es.addEventListener("complete", async (event) => {
      try {
        const images = rpc.listImages.infiniteQueryKey();
        await queryClient.invalidateQueries({ queryKey: images });
        await queryClient.invalidateQueries({
          queryKey: rpc.recentJob.queryKey("txt2img"),
        });

        setStatus({ id, status: "completed" });
        usePreviewImage
          .getState()
          .setPreviewImages("txt2img", z.string().parse(event.data).split(","));
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
  }, [recentJob, queryClient, rpc.listImages, rpc.recentJob, status]);

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
    recentJob,
    addLog,
    connect(id: string) {
      if (status?.id === id && status.status === "pending") return;
      esRef.current?.close?.();
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
  recentJob: undefined,
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
