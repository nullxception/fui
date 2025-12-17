import { ConsoleOutput } from "@/components/ConsoleOutput";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { JobQueryContext, JobQueryProvider } from "@/hooks/useJobQuery";
import { useTRPC } from "@/query";
import { useAppStore } from "@/stores/useAppStore";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion, type HTMLMotionProps } from "framer-motion";
import { AlertTriangleIcon, CircleStopIcon, ZapIcon } from "lucide-react";
import { forwardRef, useContext, useState } from "react";
import { GGML_WEIGHTS_TYPE } from "server/types";

function LogsPanel({ className }: { className?: string }) {
  const { job, logs } = useContext(JobQueryContext);

  return (
    <div
      className={`overflow-clip rounded-xl border border-border backdrop-blur-md lg:mb-4 ${className}`}
    >
      <ConsoleOutput logs={logs.filter((log) => log.jobId === job?.id)} />
    </div>
  );
}

function ConverterPanel() {
  const [model, setModel] = useState("");
  const [output, setOutput] = useState("");
  const hideGGUF = useAppStore((s) => s.hideGGUF);
  const [type, setType] = useState("q8_0");
  const rpc = useTRPC();
  const { data: models } = useQuery(rpc.listModels.queryOptions());
  const { job, connect, setError, stop } = useContext(JobQueryContext);
  const isOutputExists = models?.checkpoints.includes(output);
  const quantizationStart = useMutation(
    rpc.startQuantization.mutationOptions({
      onError(err) {
        setError(err.message);
      },
      onSuccess() {
        connect();
      },
    }),
  );
  const quantizationStop = useMutation(
    rpc.stopQuantization.mutationOptions({
      onError(err) {
        setError(err.message);
        stop();
      },
      onSuccess() {
        stop();
      },
    }),
  );

  const filteredModels = hideGGUF
    ? models?.checkpoints.filter((m) => !m.endsWith(".gguf"))
    : models?.checkpoints;

  const updateOutput = (newModel: string, newType: string) => {
    if (newModel && newType) {
      const nameWithoutExt = newModel.substring(0, newModel.lastIndexOf("."));
      setOutput(`${nameWithoutExt}.${newType}.gguf`);
    }
  };

  const handleModelChange = (val: string) => {
    setModel(val);
    updateOutput(val, type);
  };

  const handleTypeChange = (val: string) => {
    setType(val);
    updateOutput(model, val);
  };

  const handleConvert = () => {
    if (job?.status === "running" && job?.id) {
      quantizationStop.mutate(job?.id);
    } else {
      quantizationStart.mutate({ model, output, type });
    }
  };

  return (
    <Card className="scrollbar-thin w-full flex-1 grow gap-0 space-y-4 overflow-y-auto py-4 backdrop-blur-md scrollbar-thumb-secondary scrollbar-track-transparent lg:max-h-full lg:shrink-0">
      <CardHeader>
        <CardTitle>Model Weight Converter</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-stretch justify-center space-y-4">
        <div className="flex flex-col items-stretch justify-between gap-4">
          <div className="flex flex-row items-center justify-between gap-4">
            <Label htmlFor="modelTargetSelect">Model</Label>
            <div className="flex flex-row items-center justify-between gap-4">
              <Label htmlFor="filterModel">Hide GGUF Models</Label>
              <Switch
                id="filterModel"
                checked={hideGGUF}
                onCheckedChange={(e) => useAppStore.getState().setHideGGUF(e)}
                title=""
              />
            </div>
          </div>

          <Select value={model} onValueChange={handleModelChange}>
            <SelectTrigger id="modelTargetSelect" className="w-full">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {filteredModels?.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-row items-center justify-between gap-4">
          <Label htmlFor="quantizationTargetSelect">Quantization</Label>
          <Select value={type} onValueChange={handleTypeChange}>
            <SelectTrigger id="quantizationTargetSelect" className="w-1/2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GGML_WEIGHTS_TYPE.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grow space-y-2">
          <Label htmlFor="quantizationOutput">Output</Label>
          <InputGroup>
            <InputGroupInput
              id="quantizationOutput"
              value={output}
              onChange={(e) => setOutput(e.target.value)}
              placeholder={`model.${type}.gguf`}
            />
          </InputGroup>
        </div>

        {isOutputExists && (
          <div className="flex items-center gap-2 text-sm text-yellow-500">
            <AlertTriangleIcon className="h-4 w-4" />
            <span>
              Warning: Output file already exists and will be overwritten.
            </span>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex w-full flex-col items-stretch bg-card p-4">
        <Button
          onClick={handleConvert}
          variant={job?.status === "running" ? "destructive" : "default"}
          size="lg"
        >
          {job?.status === "running" ? (
            <>
              <CircleStopIcon className="animate-pulse" />
              Stop Quantization
            </>
          ) : (
            <>
              <ZapIcon />
              Quantize Model
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

export const Converter = forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(
  (props, ref) => {
    return (
      <motion.div
        ref={ref}
        className="container mx-auto max-w-screen-2xl"
        {...props}
      >
        <div className="flex items-center p-4 md:hidden">
          <Logo />
        </div>
        <div className="flex flex-auto flex-col gap-2 p-2 lg:h-full lg:flex-row">
          <JobQueryProvider type="convert">
            <LogsPanel className="h-[30vh] bg-background/60 lg:h-[80vh] lg:w-1/2" />
            <div className="w-full lg:max-h-screen lg:w-1/2">
              <ConverterPanel />
              <Footer className="col-span-full flex justify-center p-4" />
            </div>
          </JobQueryProvider>
        </div>
      </motion.div>
    );
  },
);
