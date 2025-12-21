import { usePreviewImage } from "@/hooks/usePreviewImage";
import { useTRPC } from "@/lib/query";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "@trpc/tanstack-react-query";
import React, { createContext, useState } from "react";
import type { JobType, LogEntry } from "server/types";
import z from "zod";
import { useAppStore } from "./useAppStore";

export const useJobQuery = (type: JobType) => {
  const rpc = useTRPC();
  const { data: job } = useQuery(rpc.info.lastJob.queryOptions(type));
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const queryClient = useQueryClient();

  function addLog(log: LogEntry) {
    setLogs((prev) => [...prev, { ...log, timestamp: Date.now() }]);
  }

  useSubscription(
    rpc.jobs.subscriptionOptions(job?.id ?? "", {
      enabled: job && job.id.length > 0 && !job.completedAt,
      onData: async (data) => {
        if (data.type === "log" && data.log) {
          addLog(data.log);
        } else if (data.type === "complete" && data.result) {
          await queryClient.invalidateQueries({
            queryKey: rpc.info.lastJob.queryKey(type),
          });
          if (type === "convert") {
            await queryClient.invalidateQueries({
              queryKey: rpc.info.models.queryKey(),
            });
          } else {
            await queryClient.invalidateQueries({
              queryKey: rpc.images.byPage.infiniteQueryKey(),
            });
            usePreviewImage
              .getState()
              .setPreviewImages(
                "txt2img",
                z.string().parse(data.result).split(","),
              );
          }
        } else if (data.type === "error") {
          if (data.result) {
            addLog({
              jobId: data.id,
              type: "stderr",
              message: z.string().parse(data.result),
              timestamp: 0,
            });
          }
          queryClient.invalidateQueries({
            queryKey: rpc.info.lastJob.queryKey(type),
          });
        }
      },
    }),
  );

  return {
    job,
    logs,
    addLog,
    async connect() {
      if (job?.status === "pending" || job?.status === "running") return;
      setLogs([]);
      await queryClient.invalidateQueries({
        queryKey: rpc.info.lastJob.queryKey(type),
      });
      useAppStore.getState().setOutputTab("console");
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
        queryKey: rpc.info.lastJob.queryKey(type),
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

export const JobQueryProvider = React.memo(
  ({ type, children }: { type: JobType; children: React.ReactNode }) => {
    const jq = useJobQuery(type);
    return <JobQueryContext value={jq}>{children}</JobQueryContext>;
  },
);
