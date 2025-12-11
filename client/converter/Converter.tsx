import { useMutation, useQuery } from "@tanstack/react-query";
import { ConsoleOutput } from "client/components/ConsoleOutput";
import { Footer } from "client/components/Footer";
import { Logo } from "client/components/Header";
import { Button } from "client/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "client/components/ui/card";
import { InputGroup, InputGroupInput } from "client/components/ui/input-group";
import { Label } from "client/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "client/components/ui/select";
import { Switch } from "client/components/ui/switch";
import { useTRPC } from "client/query";
import { useAppStore } from "client/stores/useAppStore";
import { useJobs } from "client/stores/useJobs";
import { motion, type HTMLMotionProps } from "framer-motion";
import { AlertTriangleIcon, CircleStopIcon, ZapIcon } from "lucide-react";
import { forwardRef, useEffect, useState } from "react";
import { GGML_WEIGHTS_TYPE } from "server/types";

function ConverterPanel() {
  const [model, setModel] = useState("");
  const [output, setOutput] = useState("");
  const { hideGGUF, setHideGGUF } = useAppStore();
  const [type, setType] = useState("q8_0");
  const rpc = useTRPC();
  const { data: models } = useQuery(rpc.listModels.queryOptions());
  const { data: process } = useQuery(rpc.listJobs.queryOptions("convert"));
  const { jobStatus, checkJobs, connectToJob, setError } = useJobs();
  const isOutputExists = models?.checkpoints.includes(output);
  const status = jobStatus("convert");
  const quantizationStart = useMutation(
    rpc.startQuantization.mutationOptions({
      onError(err) {
        setError("convert", err.message);
      },
      onSuccess(data) {
        connectToJob(data.jobId, "convert");
      },
    }),
  );
  const quantizationStop = useMutation(rpc.stopQuantization.mutationOptions());

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
    if (status?.isProcessing && status?.id) {
      quantizationStop.mutate(status?.id);
    } else {
      quantizationStart.mutate({ model, output, type });
    }
  };

  useEffect(() => {
    if (process) {
      checkJobs(process);
    }
  }, [checkJobs, process]);

  return (
    <Card className="scrollbar-thin w-full flex-1 grow space-y-4 overflow-y-auto py-4 backdrop-blur-md scrollbar-thumb-secondary scrollbar-track-transparent lg:max-h-full lg:shrink-0">
      <CardHeader>
        <CardTitle>Model Weight Converter</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-stretch justify-center space-y-4">
        <div className="flex flex-col items-stretch justify-between gap-4">
          <div className="flex flex-row items-center justify-between gap-4">
            <Label>Model</Label>
            <div className="flex flex-row items-center justify-between gap-4">
              <Label htmlFor="filterModel">Hide GGUF Models</Label>
              <Switch
                id="filterModel"
                checked={hideGGUF}
                onCheckedChange={(e) => setHideGGUF(e)}
                title=""
              />
            </div>
          </div>

          <Select value={model} onValueChange={handleModelChange}>
            <SelectTrigger className="w-full">
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
          <Label>Quantization</Label>
          <Select value={type} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-1/2">
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
          <Label>Output</Label>
          <InputGroup>
            <InputGroupInput
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
        <Button
          onClick={handleConvert}
          variant={status?.isProcessing ? "destructive" : "default"}
          size="lg"
        >
          {status?.isProcessing ? (
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
      </CardContent>
    </Card>
  );
}

export const Converter = forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(
  (props, ref) => {
    const { jobStatus, logs } = useJobs();
    const jobState = jobStatus("convert");

    return (
      <motion.div
        ref={ref}
        className="container mx-auto flex min-h-0 max-w-screen-2xl flex-1 flex-col lg:overflow-hidden"
        {...props}
      >
        <div className="flex items-center p-4 md:hidden">
          <Logo />
        </div>
        <div className="flex flex-auto flex-col gap-4 p-2 lg:h-full lg:flex-row">
          <ConsoleOutput
            logs={logs.filter((log) => log.jobId === jobState?.id)}
            className="mb-4 rounded-xl border border-border"
          />
          <div className="w-full lg:max-h-screen lg:w-[40vw]">
            <ConverterPanel />
            <Footer className="col-span-full flex justify-center p-4" />
          </div>
        </div>
      </motion.div>
    );
  },
);
