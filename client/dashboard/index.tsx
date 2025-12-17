import { DottedBackground } from "@/components/DottedBackground";
import { Logo } from "@/components/Header";
import { NavItem, type NavEntry } from "@/components/NavItems";
import { Button } from "@/components/ui/button";
import { JobQueryContext, JobQueryProvider } from "@/hooks/useJobQuery";
import { useTRPC } from "@/query";
import { useAppStore } from "@/stores/useAppStore";
import { usePreviewImage } from "@/stores/usePreviewImage";
import type { Timeout } from "@/types";
import { useMutation, useQuery } from "@tanstack/react-query";
import { formatDuration, intervalToDuration } from "date-fns";
import {
  CircleStopIcon,
  ClockIcon,
  ImageIcon,
  TerminalIcon,
  ZapIcon,
} from "lucide-react";
import { AnimatePresence, motion, type HTMLMotionProps } from "motion/react";
import { forwardRef, useContext, useEffect, useRef, useState } from "react";
import { optimizePrompt } from "server/lib/metadataParser";
import type { Job } from "server/types";
import { useShallow } from "zustand/react/shallow";
import { ConsoleOutput } from "../components/ConsoleOutput";
import { ControlPanel } from "./ControlPanel";
import { ImageDisplay } from "./ImageDisplay";
import { useDiffusionConfig } from "./useDiffusionConfig";

type TabType = "image" | "console";

const tabItems: Array<NavEntry<TabType>> = [
  { name: "Image", target: "image", icon: ImageIcon },
  { name: "Console", target: "console", icon: TerminalIcon },
];

function getCompletionTime(job: Job) {
  if (!job.completedAt) return;
  const start = new Date(job.createdAt);
  const end = new Date(job.completedAt);
  const duration = intervalToDuration({ start, end });
  const units = { xHours: "h", xMinutes: "m", xSeconds: "s" };
  return formatDuration(duration, {
    format: ["hours", "minutes", "seconds"],
    delimiter: " ",
    locale: {
      formatDistance: (token, count) => {
        const unit = Object.entries(units).find(([k]) => k === token)?.[1];
        return unit ? `${count}${unit}` : "";
      },
    },
  });
}

function OutputCard() {
  const { job, logs } = useContext(JobQueryContext);
  const isProcessing = job?.status === "running";
  const outputTab = useAppStore((s) => s.outputTab);
  const { urls, from } = usePreviewImage(
    useShallow((s) => ({ urls: s.urls, from: s.from })),
  );
  const [showCompTime, setShowCompTime] = useState<boolean | null>(null);
  const compTimeRef = useRef<Timeout | null>(null);

  const last = from === "txt2img" && job?.status === "completed" ? job : null;
  const compTime =
    urls?.[0] && last?.result?.includes(urls?.[0]) && getCompletionTime(last);

  useEffect(() => {
    if (!compTime || showCompTime !== null) return;
    if (compTimeRef.current) clearTimeout(compTimeRef.current);
    compTimeRef.current = setTimeout(() => {
      if (showCompTime === null) {
        setShowCompTime(false);
      }
    }, 2000);
  }, [from, compTime, showCompTime]);

  return (
    <>
      <div className="flex items-center justify-center gap-2 border-b border-border bg-background/20 p-3">
        <nav className="flex w-8/10 items-center justify-center gap-2 rounded-lg border border-border bg-background/50 p-1 md:w-6/10">
          {tabItems.map((item) => (
            <AnimatePresence key={item.target} mode="wait">
              <NavItem
                entry={item}
                isActive={outputTab === item.target}
                setActiveEntry={(entry) =>
                  useAppStore.getState().setOutputTab(entry.target)
                }
                className="w-1/2"
                groupName="output-tabs"
                hideInactiveIcons={false}
              />
            </AnimatePresence>
          ))}
        </nav>
      </div>

      <div className="relative min-h-0 w-full flex-1">
        <DottedBackground />
        {outputTab === "image" ? (
          <ImageDisplay
            imageUrls={urls ?? []}
            isProcessing={isProcessing ?? false}
          />
        ) : (
          <ConsoleOutput logs={logs.filter((x) => x.jobId === job?.id)} />
        )}
        {compTime && (
          <div
            onClick={() =>
              setShowCompTime(showCompTime === null ? false : !showCompTime)
            }
            className={`absolute right-2 bottom-2 z-2 flex cursor-pointer flex-row items-center justify-center gap-2 rounded-xl border border-primary bg-primary/50 px-1.5 py-0.5 text-xs font-semibold backdrop-blur-xs select-none ${
              showCompTime !== false
                ? "opacity-100"
                : "opacity-50 hover:opacity-100"
            } transition-opacity duration-300`}
          >
            <AnimatePresence>
              {showCompTime !== false && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="overflow-clip text-nowrap"
                >
                  Completed in {compTime}
                </motion.div>
              )}
            </AnimatePresence>
            <ClockIcon className="w-4" />
          </div>
        )}
      </div>
    </>
  );
}

function TextToImageAction() {
  const { job, connect, setError, stop } = useContext(JobQueryContext);
  const store = useDiffusionConfig();
  const rpc = useTRPC();
  const { data: models } = useQuery(rpc.listModels.queryOptions());
  const diffusionStart = useMutation(
    rpc.startDiffusion.mutationOptions({
      onError(error) {
        setError(error.message);
      },
      onSuccess() {
        connect();
      },
    }),
  );

  const diffusionStop = useMutation(
    rpc.stopDiffusion.mutationOptions({
      onError(err) {
        setError(err.message);
        stop();
      },
      onSuccess() {
        stop();
      },
    }),
  );

  const isProcessing = job?.status === "running" || job?.status === "pending";
  const handleDiffusion = async () => {
    if (isProcessing && job?.id) {
      diffusionStop.mutate(job.id);
    } else if (!isProcessing) {
      await store.updateAll({
        prompt: optimizePrompt(store.params.prompt, models),
        negativePrompt: optimizePrompt(store.params.negativePrompt, models),
      });
      diffusionStart.mutate(store.params);
    }
  };

  return (
    <div className="relative">
      <div
        className={`absolute top-0 left-0 -z-1 h-full w-full rounded-xl shadow-md ${isProcessing ? "animate-pulse shadow-destructive" : "shadow-primary"}`}
      />
      <Button
        onClick={handleDiffusion}
        variant="ghost"
        size="lg"
        className={`my-1 flex w-full cursor-pointer flex-row items-center justify-center gap-2 rounded-xl hover:bg-background!`}
      >
        {isProcessing ? (
          <>
            <CircleStopIcon className="text-destructive" />
            Stop
          </>
        ) : (
          <>
            <ZapIcon className="text-primary" />
            Generate
            {store.params.batchMode && ` ${store.params.batchCount} images`}
          </>
        )}
      </Button>
    </div>
  );
}

export const TextToImage = forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(
  (props, ref) => {
    return (
      <motion.div
        ref={ref}
        className="container mx-auto max-w-screen-2xl p-2 lg:overflow-hidden"
        {...props}
      >
        <div className="flex items-center p-4 md:hidden">
          <Logo />
        </div>
        <div className="flex flex-col gap-2 lg:h-full lg:flex-row lg:items-stretch">
          <div className="flex min-h-0 flex-col overflow-clip rounded-xl border border-border bg-background/60 lg:mb-4 lg:w-1/2">
            <JobQueryProvider type="txt2img">
              <div className="flex min-h-[50vh] flex-1 flex-col overflow-hidden backdrop-blur-xs">
                <OutputCard />
              </div>
              <div className="rounded-xl border border-r-0 border-b-0 border-l-0 border-border p-2 backdrop-blur-xs">
                <TextToImageAction />
              </div>
            </JobQueryProvider>
          </div>
          <ControlPanel className="lg:w-1/2" />
        </div>
      </motion.div>
    );
  },
);
