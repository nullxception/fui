import { NumberInput } from "@/components/NumberInput";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { defaultUserConfig } from "server/defaults";
import { useSettings } from "./useSettings";

function SliderSettings() {
  const { settings, update } = useSettings();
  const defs = defaultUserConfig().settings;

  return (
    <Card className="gap-0 space-y-4 space-x-4 bg-background/60 p-4 backdrop-blur-sm">
      <div className="flex w-full flex-row items-center justify-between space-y-2">
        <Label htmlFor="maxWidthSliderSetting">Max width slider</Label>
        <NumberInput
          id="maxWidthSliderSetting"
          placeholder={`default: ${defs.maxWidth}`}
          min={64}
          step={64}
          value={settings.maxWidth}
          onChange={(e) => update("maxWidth", e)}
          className="w-40"
        />
      </div>
      <div className="flex w-full flex-row items-center justify-between space-y-2">
        <Label htmlFor="maxHeightSliderSetting">Max height slider</Label>
        <NumberInput
          id="maxHeightSliderSetting"
          placeholder={`default: ${defs.maxHeight}`}
          min={64}
          step={64}
          value={settings.maxHeight}
          onChange={(e) => update("maxHeight", e)}
          className="w-40"
        />
      </div>
    </Card>
  );
}

export default SliderSettings;
