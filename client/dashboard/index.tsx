import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "client/components/ui/button";
import { useTRPC } from "client/query";
import { useAppStore } from "client/stores/useAppStore";
import { motion, type HTMLMotionProps } from "framer-motion";
import { CircleStopIcon, ImageIcon, TerminalIcon, ZapIcon } from "lucide-react";
import { forwardRef, useEffect } from "react";
import { optimizePrompt } from "../lib/metadataParser";
import ConsoleOutput from "./ConsoleOutput";
import ControlPanel from "./ControlPanel";
import ImageDisplay from "./ImageDisplay";
import { useDiffusionConfig } from "./useDiffusionConfig";
import { useDiffusionJob } from "./useDiffusionJob";

const TextToImage = forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(
  (props, ref) => {
    const { outputTab, setOutputTab } = useAppStore();
    const { jobId, image, isProcessing, checkJobs, connectToJob, setError } =
      useDiffusionJob();
    const store = useDiffusionConfig();
    const rpc = useTRPC();
    const { data: models } = useQuery(rpc.listModels.queryOptions());
    const { data: jobs } = useQuery(rpc.listJobs.queryOptions("txt2img"));
    const diffusionStart = useMutation(
      rpc.startDiffusion.mutationOptions({
        onError() {
          setError("Failed to generate image");
        },
        onSuccess(data) {
          connectToJob(data.jobId);
        },
      }),
    );

    const diffusionStop = useMutation(rpc.stopDiffusion.mutationOptions());

    useEffect(() => {
      if (jobs) {
        checkJobs(jobs);
      }
    }, [checkJobs, jobs]);

    const handleDiffusion = async () => {
      if (isProcessing) {
        diffusionStop.mutate(jobId);
      } else {
        await store.updateAll({
          prompt: optimizePrompt(store.params.prompt, models),
          negativePrompt: optimizePrompt(store.params.negativePrompt, models),
        });
        diffusionStart.mutate(store.params);
      }
    };

    return (
      <motion.div
        ref={ref}
        className="container mx-auto flex min-h-0 max-w-screen-2xl flex-1 flex-col lg:overflow-hidden"
        {...props}
      >
        <div className="flex flex-col gap-4 p-2 lg:h-full lg:flex-row">
          {/* Left Side: Image/Console */}
          <div className="mb-4 flex min-h-0 flex-1 flex-col overflow-clip rounded-xl border border-border">
            <div className="flex min-h-[50vh] flex-1 flex-col overflow-hidden bg-background/20 backdrop-blur-sm">
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
                  <ImageDisplay image={image} isProcessing={isProcessing} />
                ) : (
                  <ConsoleOutput />
                )}
              </div>
            </div>
            {/* Generate Button */}
            <div className="rounded-xl border border-r-0 border-b-0 border-l-0 border-border bg-background/20 p-2 backdrop-blur-sm">
              <Button
                onClick={handleDiffusion}
                variant={isProcessing ? "destructive" : "default"}
                size="lg"
                className="w-full rounded-xl"
              >
                {isProcessing ? (
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
            </div>
          </div>

          {/* Right Side: Control Panel */}
          <ControlPanel />
        </div>
      </motion.div>
    );
  },
);

export default TextToImage;
