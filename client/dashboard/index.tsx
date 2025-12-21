import { ConsoleOutput } from "@/components/ConsoleOutput";
import { DottedBackground } from "@/components/DottedBackground";
import { NavItem, type NavEntry } from "@/components/NavItems";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/hooks/useAppStore";
import { useDiffusionConf } from "@/hooks/useDiffusionConfig";
import { JobQueryContext, JobQueryProvider } from "@/hooks/useJobQuery";
import { useTRPC } from "@/lib/query";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ClockIcon,
  ImageIcon,
  TerminalIcon,
  XIcon,
  ZapIcon,
} from "lucide-react";
import { AnimatePresence, motion, type HTMLMotionProps } from "motion/react";
import { forwardRef, useContext } from "react";
import { optimizePrompt } from "server/lib/metadataParser";
import { useShallow } from "zustand/react/shallow";
import { ImageResult } from "./ImageResult";
import { ControlPanel } from "./panel";

type TabType = "image" | "console";

const tabItems: Array<NavEntry<TabType>> = [
  { name: "Image", target: "image", icon: ImageIcon },
  { name: "Console", target: "console", icon: TerminalIcon },
];
function ConsoleTimeToggle() {
  const { showConsoleTime, setShowConsoleTime } = useAppStore(
    useShallow((s) => ({
      showConsoleTime: s.showLogsTime,
      setShowConsoleTime: s.setShowLogsTime,
    })),
  );

  return (
    <Button
      variant="outline"
      size="icon-sm"
      onClick={() => setShowConsoleTime(!showConsoleTime)}
      className={`absolute right-4 ${showConsoleTime && "border-primary! bg-primary/25!"}`}
    >
      <ClockIcon />
    </Button>
  );
}

function OutputTabs() {
  const { outputTab } = useAppStore(
    useShallow((s) => ({ outputTab: s.outputTab })),
  );
  return (
    <div className="flex items-center justify-center gap-2 border-b border-border bg-background/20 p-3">
      <nav className="flex w-8/11 items-center justify-center gap-2 rounded-lg border border-border bg-background/50 p-1 md:w-6/10">
        <AnimatePresence>
          {tabItems.map((item) => (
            <NavItem
              key={item.target}
              entry={item}
              isActive={outputTab === item.target}
              setActiveEntry={(entry) =>
                useAppStore.getState().setOutputTab(entry.target)
              }
              className="w-1/2"
              groupName="output-tabs"
              hideInactiveIcons={false}
            />
          ))}
        </AnimatePresence>
      </nav>
      {outputTab === "console" && <ConsoleTimeToggle />}
    </div>
  );
}

function OutputCard() {
  const outputTab = useAppStore((s) => s.outputTab);
  return (
    <>
      <OutputTabs />
      <div className="relative min-h-0 w-full flex-1">
        <DottedBackground />
        {outputTab === "image" ? <ImageResult /> : <ConsoleOutput />}
      </div>
    </>
  );
}
function GenerateButtonLabel() {
  const batchMode = useDiffusionConf("batchMode");
  const batchCount = useDiffusionConf("batchCount");
  return (
    <motion.span
      key="generate"
      layout="preserve-aspect"
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 20, opacity: 0 }}
      transition={{ duration: 0.1 }}
      className="flex items-center gap-1"
    >
      <ZapIcon className="mr-1 size-4.5 text-primary" />
      Generate
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={`gb${batchCount.value ?? 1}`}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ duration: 0.1 }}
        >
          {batchMode.value && `${batchCount.value} images`}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}
function TextToImageAction() {
  const { job, connect, setError, stop } = useContext(JobQueryContext);
  const promptStore = useDiffusionConf("prompt");
  const negativePromptStore = useDiffusionConf("negativePrompt");
  const rpc = useTRPC();
  const { data: models } = useQuery(rpc.info.models.queryOptions());
  const diffusionStart = useMutation(
    rpc.txt2img.start.mutationOptions({
      onError(error) {
        setError(error.message);
      },
      onSuccess() {
        connect();
      },
    }),
  );

  const diffusionStop = useMutation(
    rpc.txt2img.stop.mutationOptions({
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
      await negativePromptStore.update(
        optimizePrompt(negativePromptStore.value, models),
      );
      await promptStore.update(optimizePrompt(promptStore.value, models));
      diffusionStart.mutate();
    }
  };

  return (
    <div className="relative">
      <div
        className={`absolute left-0 -z-1 h-full w-full rounded-xl shadow-md ${isProcessing ? "animate-pulse shadow-destructive" : "shadow-primary"}`}
      />
      <motion.button
        onClick={handleDiffusion}
        layout
        className="my-1 mt-2 flex h-9 w-full cursor-pointer flex-row items-center justify-center gap-2 overflow-hidden rounded-xl p-2 text-sm hover:bg-background"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isProcessing ? (
            <motion.span
              key="stop"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="flex items-center gap-1"
            >
              <XIcon className="mr-1 size-4.5 text-destructive" />
              Stop
            </motion.span>
          ) : (
            <GenerateButtonLabel />
          )}
        </AnimatePresence>
      </motion.button>
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
