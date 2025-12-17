import { useTRPC } from "@/query";
import { usePreviewImage } from "@/stores/usePreviewImage";
import type { Timeout } from "@/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useEffect, useRef, useState } from "react";
import type { JobType, LogEntry } from "server/types";
import { logEntrySchema } from "server/types/jobs";
import z from "zod";
import { useAppStore } from "../stores/useAppStore";

export const useJobQuery = (type: JobType) => {
  const rpc = useTRPC();
  const { data: job } = useQuery(rpc.recentJob.queryOptions(type));
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const esRef = useRef<EventSource | null>(null);
  const closingRef = useRef<Timeout | null>(null);
  const queryClient = useQueryClient();
  const hasLogs = logs.length > 0;

  function addLog(log: LogEntry) {
    setLogs((prev) => [...prev, { ...log, timestamp: Date.now() }]);
  }

  useEffect(() => {
    const esState = esRef.current?.readyState;
    if (esState === EventSource.OPEN || esState === EventSource.CONNECTING)
      return;

    if (esRef.current) esRef.current.close();

    if (!job?.id) return;

    const stopped = ["completed", "failed", "cancelled"];
    if (stopped.includes(job.status)) return;

    const es = new EventSource(`/api/jobs/${job?.id}`);
    esRef.current = es;

    const close = () => {
      es.close();
      queryClient.invalidateQueries({
        queryKey: rpc.recentJob.queryKey(type),
      });
    };

    es.addEventListener("open", () => {
      setLogs([]);
      useAppStore.getState().setOutputTab("console");
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
        await queryClient.invalidateQueries({
          queryKey: rpc.recentJob.queryKey("txt2img"),
        });

        usePreviewImage
          .getState()
          .setPreviewImages("txt2img", z.string().parse(event.data).split(","));
        close();
      } catch (e) {
        console.error(e);
      }
    });

    es.addEventListener("error", (event: MessageEvent) => {
      try {
        addLog({
          jobId: job?.id,
          type: "stderr",
          message: z.string().parse(event.data),
          timestamp: Date.now(),
        });
      } catch (e) {
        console.error(e);
      }
      if (!closingRef.current) {
        closingRef.current = setTimeout(() => {
          close();
          closingRef.current = null;
        }, 500);
      }
    });

    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [job, hasLogs, queryClient, rpc.listImages, rpc.recentJob, type]);

  return {
    job,
    logs,
    addLog,
    async connect() {
      if (job?.status === "pending" || job?.status === "running") return;
      await queryClient.invalidateQueries({
        queryKey: rpc.recentJob.queryKey(type),
      });
    },
    setError(message: string) {
      addLog({
        type: "stderr",
        message,
        jobId: job?.id ?? "",
        timestamp: Date.now(),
      });
    },
    stop() {
      queryClient.invalidateQueries({
        queryKey: rpc.recentJob.queryKey(type),
      });
    },
  };
};

export const JobQueryContext = createContext<ReturnType<typeof useJobQuery>>({
  logs: [],
  job: undefined,
  setError: () => {},
  addLog: () => {},
  connect: async () => {},
  stop: () => {},
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
