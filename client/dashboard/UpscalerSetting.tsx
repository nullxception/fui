import { SliderInput } from "@/components/SliderInput";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useTRPC } from "@/query";
import { useQuery } from "@tanstack/react-query";
import z from "zod";
import { useDiffusionConfig } from "./useDiffusionConfig";

export function UpscalerSetting() {
  const store = useDiffusionConfig();
  const rpc = useTRPC();
  const { data: models } = useQuery(rpc.listModels.queryOptions());

  const enabledUpscaler = z
    .string()
    .min(1)
    .safeParse(store.params.upscaleModel).success;
  return (
    <>
      <div className="space-y-2 pt-2">
        <Label htmlFor="upscaleModelSelect">Upscaler</Label>
        <Select
          value={store.params.upscaleModel ?? ""}
          onValueChange={(e) => {
            if (e === "unset") {
              store.unset("upscaleModel");
              return;
            }
            store.update("upscaleModel", e);
          }}
        >
          <SelectTrigger id="upscaleModelSelect" className="w-full">
            <SelectValue placeholder="Select Upscaler" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="unset">unset</SelectItem>
              {models?.upscalers.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <SliderInput
        label={`Upscale iteration`}
        min={1}
        max={5}
        step={1}
        value={store.params.upscaleRepeats ?? 2}
        onChange={(e) => store.update("upscaleRepeats", e)}
        disabled={!enabledUpscaler}
      />

      {enabledUpscaler && (
        <>
          <div className="flex items-center justify-between py-2">
            <Label htmlFor="upscaleTileSizeSwitch">
              Override upscaler tile size
            </Label>
            <Switch
              id="upscaleTileSizeSwitch"
              checked={store.params.upscaleTileSize !== undefined}
              onCheckedChange={(e) =>
                e
                  ? store.update("upscaleTileSize", 128)
                  : store.unset("upscaleTileSize")
              }
              disabled={!enabledUpscaler}
            />
          </div>

          <SliderInput
            label={`Upscaler Tile Size`}
            min={64}
            max={1024}
            step={64}
            value={store.params.upscaleTileSize ?? 128}
            onChange={(e) => store.update("upscaleTileSize", e)}
            disabled={store.params.upscaleTileSize === undefined}
          />
        </>
      )}
    </>
  );
}
