import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "client/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "client/components/ui/card";
import {
  InputGroup,
  InputGroupInput,
  InputGroupText,
} from "client/components/ui/input-group";
import { Label } from "client/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "client/components/ui/select";
import { useTRPC } from "client/query";
import { motion, type HTMLMotionProps } from "framer-motion";
import { AlertTriangleIcon } from "lucide-react";
import { useState } from "react";
import { GGML_WEIGHTS_TYPE } from "server/types";

export default function Converter(props: HTMLMotionProps<"div">) {
  const rpc = useTRPC();
  const { data: models } = useQuery(rpc.listModels.queryOptions());

  const filteredModels = models?.checkpoints.filter(
    (m) => !m.endsWith(".gguf"),
  );

  const [model, setModel] = useState("");
  const [output, setOutput] = useState("");
  const [type, setType] = useState("q8_0");
  const [logs, setLogs] = useState("");

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

  const isOutputExists = models?.checkpoints.includes(output);

  const convertMutation = useMutation(
    rpc.convertModel.mutationOptions({
      onSuccess: (data) => {
        setLogs((prev) => prev + "\n" + data.stdout + "\n" + data.message);
      },
      onError: (error) => {
        setLogs((prev) => prev + "\nError: " + error.message);
      },
    }),
  );

  const handleConvert = () => {
    setLogs("Starting conversion...");
    convertMutation.mutate({
      model,
      output,
      type,
    });
  };

  return (
    <motion.div className="container mx-auto p-4" {...props}>
      <Card className="py-4">
        <CardHeader className="py-4">
          <CardTitle>Model Weight Converter</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-stretch justify-center space-y-4">
          <div className="space-y-2">
            <Label>Model</Label>
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

          <div className="flex flex-row gap-4">
            <div className="space-y-2">
              <Label>Quantization</Label>
              <Select value={type} onValueChange={handleTypeChange}>
                <SelectTrigger className="w-full">
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
                <InputGroupText className="ml-4">checkpoints/</InputGroupText>
                <InputGroupInput
                  value={output}
                  onChange={(e) => setOutput(e.target.value)}
                  placeholder={`model.${type}.gguf`}
                />
              </InputGroup>
              {isOutputExists && (
                <div className="flex items-center gap-2 text-sm text-yellow-500">
                  <AlertTriangleIcon className="h-4 w-4" />
                  <span>
                    Warning: Output file already exists and will be overwritten.
                  </span>
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={handleConvert}
            disabled={convertMutation.isPending || !model || !output}
          >
            {convertMutation.isPending ? "Converting..." : "Convert"}
          </Button>

          {logs && (
            <div className="mt-4 rounded-md bg-black/10 p-4 font-mono text-sm whitespace-pre-wrap">
              {logs}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
