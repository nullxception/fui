import { NumberInput } from "@/components/NumberInput";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { defaultUserConfig } from "server/defaults";
import { useSettings } from "./useSettings";

function MaxWidthSetting() {
  const { value, update } = useSettings("maxWidth");
  const defs = defaultUserConfig().settings;

  return (
    <div className="flex w-full flex-row items-center justify-between space-y-2">
      <Label htmlFor="maxWidthSliderSetting">Max width slider</Label>
      <NumberInput
        id="maxWidthSliderSetting"
        placeholder={`default: ${defs.maxWidth}`}
        min={64}
        step={64}
        value={value}
        onChange={(e) => update(e)}
        className="w-40"
      />
    </div>
  );
}

function MaxHeightSetting() {
  const { value, update } = useSettings("maxHeight");
  const defs = defaultUserConfig().settings;

  return (
    <div className="flex w-full flex-row items-center justify-between space-y-2">
      <Label htmlFor="maxHeightSliderSetting">Max height slider</Label>
      <NumberInput
        id="maxHeightSliderSetting"
        placeholder={`default: ${defs.maxHeight}`}
        min={64}
        step={64}
        value={value}
        onChange={(e) => update(e)}
        className="w-40"
      />
    </div>
  );
}

export function SliderSettings() {
  return (
    <Card className="gap-0 space-y-4 space-x-4 bg-background/60 p-4 backdrop-blur-xs">
      <MaxWidthSetting />
      <MaxHeightSetting />
    </Card>
  );
}
