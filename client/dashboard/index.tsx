import { useMutation, useQuery } from "@tanstack/react-query";
import { Logo } from "client/components/Header";
import { Button } from "client/components/ui/button";
import { JobQueryContext, JobQueryProvider } from "client/hooks/useJobQuery";
import { useTRPC } from "client/query";
import { useAppStore } from "client/stores/useAppStore";
import { usePreviewImage } from "client/stores/usePreviewImage";
import { motion, type HTMLMotionProps } from "framer-motion";
import { CircleStopIcon, ImageIcon, TerminalIcon, ZapIcon } from "lucide-react";
import { forwardRef, useContext } from "react";
import { ConsoleOutput } from "../components/ConsoleOutput";
import { optimizePrompt } from "../lib/metadataParser";
import { ControlPanel } from "./ControlPanel";
import { ImageDisplay } from "./ImageDisplay";
import { useDiffusionConfig } from "./useDiffusionConfig";

function OutputCard() {
  const { status: job, logs } = useContext(JobQueryContext);
  const isProcessing = job?.status === "running";
  const { outputTab, setOutputTab } = useAppStore();
  const { image } = usePreviewImage();

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
          <ImageDisplay image={image} isProcessing={isProcessing ?? false} />
        ) : (
          <ConsoleOutput logs={logs.filter((x) => x.jobId === job?.id)} />
        )}
      </div>
    </>
  );
}

function TextToImageAction() {
  const { status: job, connect, setError } = useContext(JobQueryContext);
  const store = useDiffusionConfig();
  const rpc = useTRPC();
  const { data: models } = useQuery(rpc.listModels.queryOptions());
  const diffusionStart = useMutation(
    rpc.startDiffusion.mutationOptions({
      onError(error) {
        setError(error.message);
      },
      onSuccess(data) {
        connect(data.jobId);
      },
    }),
  );
  const diffusionStop = useMutation(rpc.stopDiffusion.mutationOptions());

  const handleDiffusion = async () => {
    if (job?.status === "running" && job?.id) {
      diffusionStop.mutate(job?.id);
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
      variant={job?.status === "running" ? "destructive" : "default"}
      size="lg"
      className="w-full rounded-xl"
    >
      {job?.status === "running" ? (
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
            <JobQueryProvider type="txt2img">
              <div className="flex min-h-[50vh] flex-1 flex-col overflow-hidden bg-background/20 backdrop-blur-sm">
                <OutputCard />
              </div>
              <div className="rounded-xl border border-r-0 border-b-0 border-l-0 border-border bg-background/20 p-2 backdrop-blur-sm">
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
