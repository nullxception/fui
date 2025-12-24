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
import { useDiffusionConf } from "@/hooks/useDiffusionConfig";
import { useSettings } from "@/settings/useSettings";

function StepsInput() {
  const store = useDiffusionConf("steps");
  return (
    <SliderInput
      label="Steps"
      valueDisplay={store.value}
      min={1}
      max={100}
      value={store.value ?? 20}
      onChange={(e) => store.update(e)}
    />
  );
}

function CfgScaleInput() {
  const store = useDiffusionConf("cfgScale");
  return (
    <SliderInput
      label="CFG Scale"
      valueDisplay={store.value}
      min={1}
      max={20}
      step={0.5}
      value={store.value ?? 7}
      onChange={(e) => store.update(e)}
    />
  );
}

function WidthInput() {
  const store = useDiffusionConf("width");
  const { value: userMaxWidth, defaultValue } = useSettings("maxWidth");
  const maxSliderWidth = userMaxWidth ?? defaultValue;

  return (
    <SliderInput
      label="Width"
      valueDisplay={store.value}
      min={128}
      step={64}
      max={maxSliderWidth}
      value={store.value ?? 512}
      onChange={(e) => store.update(e)}
    />
  );
}

function HeightInput() {
  const store = useDiffusionConf("height");
  const { value: userMaxWidth, defaultValue } = useSettings("maxHeight");
  const maxSliderHeight = userMaxWidth ?? defaultValue;

  return (
    <SliderInput
      label="Height"
      valueDisplay={store.value}
      min={128}
      step={64}
      max={maxSliderHeight}
      value={store.value ?? 512}
      onChange={(e) => store.update(e)}
    />
  );
}

function SamplingMethodSelect() {
  const store = useDiffusionConf("samplingMethod");
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

  return (
    <div className="space-y-4">
      <Label htmlFor="samplingMethodSelect">Sampling Method</Label>
      <Select
        value={store.value ?? ""}
        onValueChange={(e) => {
          if (e === "unset") {
            store.unset();
            return;
          }
          store.update(e);
        }}
      >
        <SelectTrigger id="samplingMethodSelect" className="w-full">
          <SelectValue placeholder={`Sampling method`} />
        </SelectTrigger>
        <SelectContent className="bg-background/80 p-1 backdrop-blur-xs">
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
  );
}

function SchedulerSelect() {
  const store = useDiffusionConf("scheduler");
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
    <div className="space-y-4">
      <Label htmlFor="schedulerSelect">Scheduler</Label>
      <Select
        value={store.value ?? ""}
        onValueChange={(e) => {
          if (e === "unset") {
            store.unset();
            return;
          }
          store.update(e);
        }}
      >
        <SelectTrigger id="schedulerSelect" className="w-full">
          <SelectValue placeholder={`Scheduler`} />
        </SelectTrigger>
        <SelectContent className="bg-background/80 p-1 backdrop-blur-xs">
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
  );
}

function ClipSkipInput() {
  const store = useDiffusionConf("clipSkip");
  return (
    <SliderInput
      label={`CLIP Skip`}
      min={-1}
      max={2}
      step={1}
      value={store.value}
      onChange={(e) => store.update(e)}
    />
  );
}

export function GenerationSettings() {
  return (
    <>
      <StepsInput />
      <CfgScaleInput />
      <WidthInput />
      <HeightInput />
      <SamplingMethodSelect />
      <SchedulerSelect />
      <ClipSkipInput />
    </>
  );
}
