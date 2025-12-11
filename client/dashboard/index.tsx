import { useMutation, useQuery } from "@tanstack/react-query";
import { Logo } from "client/components/Header";
import { Button } from "client/components/ui/button";
import { useTRPC } from "client/query";
import { useAppStore } from "client/stores/useAppStore";
import { motion, type HTMLMotionProps } from "framer-motion";
import { CircleStopIcon, ImageIcon, TerminalIcon, ZapIcon } from "lucide-react";
import { forwardRef, useEffect } from "react";
import { ConsoleOutput } from "../components/ConsoleOutput";
import { optimizePrompt } from "../lib/metadataParser";
import { useJobs } from "../stores/useJobs";
import { ControlPanel } from "./ControlPanel";
import { ImageDisplay } from "./ImageDisplay";
import { useDiffusionConfig } from "./useDiffusionConfig";

function OutputCard() {
  const { outputTab, setOutputTab } = useAppStore();
  const { jobStatus, logs } = useJobs();
  const status = jobStatus("txt2img");

  return (
    <>
      <div className="flex items-center justify-center gap-2 border-b border-border/40 bg-background/20 p-3">
        <Button
          variant={outputTab === "image" ? "default" : "outline"}
          size="sm"
          onClick={() => setOutputTab("image")}
          className="w-1/4"
        >
          <ImageIcon />
          Image
        </Button>
        <Button
          variant={outputTab === "console" ? "default" : "outline"}
          size="sm"
          onClick={() => setOutputTab("console")}
          className="w-1/4"
        >
          <TerminalIcon />
          Console
        </Button>
      </div>

      <div className="relative min-h-0 w-full flex-1">
        {outputTab === "image" ? (
          <ImageDisplay
            image={status?.image}
            isProcessing={status?.isProcessing ?? false}
          />
        ) : (
          <ConsoleOutput logs={logs.filter((x) => x.jobId === status?.id)} />
        )}
      </div>
    </>
  );
}

function TextToImageAction() {
  const { jobStatus, checkJobs, connectToJob, setError } = useJobs();
  const store = useDiffusionConfig();
  const rpc = useTRPC();
  const { data: models } = useQuery(rpc.listModels.queryOptions());
  const { data: process } = useQuery(rpc.listJobs.queryOptions("txt2img"));
  const status = jobStatus("txt2img");
  const diffusionStart = useMutation(
    rpc.startDiffusion.mutationOptions({
      onError(error) {
        setError("txt2img", error.message);
      },
      onSuccess(data) {
        connectToJob(data.jobId, "txt2img");
      },
    }),
  );
  const diffusionStop = useMutation(rpc.stopDiffusion.mutationOptions());

  useEffect(() => {
    if (process) {
      checkJobs(process);
    }
  }, [checkJobs, process]);

  const handleDiffusion = async () => {
    if (status?.isProcessing && status?.id) {
      diffusionStop.mutate(status?.id);
    } else {
      await store.updateAll({
        prompt: optimizePrompt(store.params.prompt, models),
        negativePrompt: optimizePrompt(store.params.negativePrompt, models),
      });
      diffusionStart.mutate(store.params);
    }
  };

  return (
    <Button
      onClick={handleDiffusion}
      variant={status?.isProcessing ? "destructive" : "default"}
      size="lg"
      className="w-full rounded-xl"
    >
      {status?.isProcessing ? (
        <>
          <CircleStopIcon className="animate-pulse" />
          Stop Generation
        </>
      ) : (
        <>
          <ZapIcon />
          Generate
        </>
      )}
    </Button>
  );
}

export const TextToImage = forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(
  (props, ref) => {
    return (
      <motion.div
        ref={ref}
        className="container mx-auto flex min-h-0 max-w-screen-2xl flex-1 flex-col lg:overflow-hidden"
        {...props}
      >
        <div className="flex items-center p-4 md:hidden">
          <Logo />
        </div>
        <div className="flex flex-col gap-2 p-2 lg:h-full lg:flex-row lg:items-stretch">
          <div className="flex min-h-0 flex-col overflow-clip rounded-xl border border-border lg:w-1/2">
            <div className="flex min-h-[50vh] flex-1 flex-col overflow-hidden bg-background/20 backdrop-blur-sm">
              <OutputCard />
            </div>
            <div className="rounded-xl border border-r-0 border-b-0 border-l-0 border-border bg-background/20 p-2 backdrop-blur-sm">
              <TextToImageAction />
            </div>
          </div>
          <ControlPanel className="lg:w-1/2" />
        </div>
      </motion.div>
    );
  },
);
