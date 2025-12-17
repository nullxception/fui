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
import { useSettings } from "@/settings/useSettings";
import { defaultUserConfig } from "server/defaults";
import { useDiffusionConfig } from "./useDiffusionConfig";

export function GenerationSettings() {
  const store = useDiffusionConfig();
  const { settings } = useSettings();
  const defs = defaultUserConfig().settings;
  const maxSliderWidth = settings.maxWidth || defs.maxWidth;
  const maxSliderHeight = settings.maxHeight || defs.maxHeight;

  const samplingMethods = [
    "euler",
    "euler_a",
    "heun",
    "dpm2",
    "dpm++2s_a",
    "dpm++2m",
    "dpm++2mv2",
    "ipndm",
    "ipndm_v",
    "lcm",
    "ddim_trailing",
    "tcd",
  ];

  const schedulers = [
    "discrete",
    "karras",
    "exponential",
    "ays",
    "gits",
    "smoothstep",
    "sgm_uniform",
    "simple",
    "lcm",
  ];

  return (
    <>
      <SliderInput
        label="Steps"
        valueDisplay={store.params.steps}
        min={1}
        max={100}
        value={store.params.steps ?? 20}
        onChange={(e) => store.update("steps", e)}
      />

      <SliderInput
        label="CFG Scale"
        valueDisplay={store.params.cfgScale}
        min={1}
        max={20}
        step={0.5}
        value={store.params.cfgScale ?? 7}
        onChange={(e) => store.update("cfgScale", e)}
      />

      <SliderInput
        label="Width"
        valueDisplay={store.params.width}
        min={128}
        step={64}
        max={maxSliderWidth}
        value={store.params.width ?? 512}
        onChange={(e) => store.update("width", e)}
      />

      <SliderInput
        label="Height"
        valueDisplay={store.params.height}
        min={128}
        step={64}
        max={maxSliderHeight}
        value={store.params.height ?? 512}
        onChange={(e) => store.update("height", e)}
      />
      <div className="space-y-4">
        <Label htmlFor="samplingMethodSelect">Sampling Method</Label>
        <Select
          value={store.params.samplingMethod ?? ""}
          onValueChange={(e) => {
            if (e === "unset") {
              store.unset("samplingMethod");
              return;
            }
            store.update("samplingMethod", e);
          }}
        >
          <SelectTrigger id="samplingMethodSelect" className="w-full">
            <SelectValue placeholder={`Sampling method`} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="unset">unset</SelectItem>
              {samplingMethods.map((method) => (
                <SelectItem key={method} value={method}>
                  {method}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <Label htmlFor="schedulerSelect">Scheduler</Label>
        <Select
          value={store.params.scheduler ?? ""}
          onValueChange={(e) => {
            if (e === "unset") {
              store.unset("scheduler");
              return;
            }
            store.update("scheduler", e);
          }}
        >
          <SelectTrigger id="schedulerSelect" className="w-full">
            <SelectValue placeholder={`Scheduler`} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="unset">unset</SelectItem>
              {schedulers.map((sched) => (
                <SelectItem key={sched} value={sched}>
                  {sched}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <SliderInput
        label={`CLIP Skip`}
        min={-1}
        max={2}
        step={1}
        value={store.params.clipSkip}
        onChange={(e) => store.update("clipSkip", e)}
      />
    </>
  );
}
