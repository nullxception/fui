import { useQuery } from "@tanstack/react-query";
import { Label } from "client/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "client/components/ui/select";
import { useTRPC } from "client/query";
import { GGML_WEIGHTS_TYPE } from "server/types";
import { useDiffusionConfig } from "./useDiffusionConfig";

export function ModelSelector() {
  const rpc = useTRPC();
  const { data } = useQuery(rpc.listModels.queryOptions());
  const store = useDiffusionConfig();

  return (
    <div className="grid grid-cols-2 gap-2 px-4 md:grid-cols-3">
      <div className="col-span-2 space-y-2 pt-2">
        <Label htmlFor="modelSelect">Model</Label>
        <Select
          value={store.params.model}
          onValueChange={(e) => store.update("model", e)}
        >
          <SelectTrigger id="modelSelect" className="w-full">
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {data &&
                data.checkpoints.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 pt-2">
        <Label htmlFor="modelTypeSelect">Model Type</Label>
        <Select
          value={store.params.modelType}
          onValueChange={(e) => store.update("modelType", e)}
        >
          <SelectTrigger id="modelTypeSelect" className="w-full">
            <SelectValue placeholder="Select a model type" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem key="standalone" value="standalone">
                Standalone Model
              </SelectItem>
              <SelectItem key="full" value="full">
                Full Model
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 pt-2">
        <Label htmlFor="vaeSelect">VAE</Label>
        <Select
          value={store.params.vae ?? ""}
          onValueChange={(e) => {
            if (e === "unset") {
              store.unset("vae");
              return;
            }
            store.update("vae", e);
          }}
        >
          <SelectTrigger id="vaeSelect" className="w-full">
            <SelectValue placeholder="Select VAE" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="unset">unset</SelectItem>
              {data &&
                data.vaes.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 pt-2">
        <Label htmlFor="clipLSSelect">CLIP-L</Label>
        <Select
          value={store.params.clipL ?? ""}
          onValueChange={(e) => {
            if (e === "unset") {
              store.unset("clipL");
              return;
            }
            store.update("clipL", e);
          }}
        >
          <SelectTrigger id="clipLSSelect" className="w-full">
            <SelectValue placeholder="Select CLIP-L" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="unset">unset</SelectItem>
              {data &&
                data.textEncoders.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 pt-2">
        <Label htmlFor="clipGSelect">CLIP-G</Label>
        <Select
          value={store.params.clipG ?? ""}
          onValueChange={(e) => {
            if (e === "unset") {
              store.unset("clipG");
              return;
            }
            store.update("clipG", e);
          }}
        >
          <SelectTrigger id="clipGSelect" className="w-full">
            <SelectValue placeholder="Select CLIP-G" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="unset">unset</SelectItem>
              {data &&
                data.textEncoders.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 pt-2">
        <Label htmlFor="t5xxlSelect">T5 XXL</Label>
        <Select
          value={store.params.t5xxl ?? ""}
          onValueChange={(e) => {
            if (e === "unset") {
              store.unset("t5xxl");
              return;
            }
            store.update("t5xxl", e);
          }}
        >
          <SelectTrigger id="t5xxlSelect" className="w-full">
            <SelectValue placeholder="Select T5 XXL" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="unset">unset</SelectItem>
              {data &&
                data.textEncoders.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 pt-2">
        <Label htmlFor="llmSelect">LLM</Label>
        <Select
          value={store.params.llm ?? ""}
          onValueChange={(e) => {
            if (e === "unset") {
              store.unset("llm");
              return;
            }
            store.update("llm", e);
          }}
        >
          <SelectTrigger id="llmSelect" className="w-full">
            <SelectValue placeholder="Select LLM" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="unset">unset</SelectItem>
              {data &&
                data.llms.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 pt-2">
        <Label htmlFor="quantizationTypeSelect">In-place Quantization</Label>
        <Select
          value={store.params.quantizationType ?? ""}
          onValueChange={(e) => {
            if (e === "unset") {
              store.unset("quantizationType");
              return;
            }
            store.update("quantizationType", e);
          }}
        >
          <SelectTrigger id="quantizationTypeSelect" className="w-full">
            <SelectValue placeholder="Select quantization type" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="unset">unset</SelectItem>
              {GGML_WEIGHTS_TYPE.map((it) => (
                <SelectItem key={it} value={it}>
                  {it}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
