import { Card } from "client/components/ui/card";
import { Input } from "client/components/ui/input";
import { Label } from "client/components/ui/label";
import { defaultUserConfig } from "server/defaults";
import { useSettings } from "./useSettings";

function SliderSettings() {
  const { settings, update } = useSettings();
  const defs = defaultUserConfig().settings;

  return (
    <Card className="gap-0 space-y-4 space-x-4 bg-background/60 p-4 backdrop-blur-sm">
      <div className="flex w-full flex-col justify-between space-y-2">
        <Label htmlFor="maxWidthSliderSetting">Max width slider</Label>
        <Input
          id="maxWidthSliderSetting"
          type="number"
          placeholder={`default: ${defs.maxWidth}`}
          min={64}
          step={64}
          value={settings.maxWidth}
          onChange={(e) => update("maxWidth", parseInt(e.target.value))}
        />
      </div>
      <div className="flex w-full flex-col justify-between space-y-2">
        <Label htmlFor="maxHeightSliderSetting">Max height slider</Label>
        <Input
          id="maxHeightSliderSetting"
          type="number"
          placeholder={`default: ${defs.maxHeight}`}
          min={64}
          step={64}
          value={settings.maxHeight}
          onChange={(e) => update("maxHeight", parseInt(e.target.value))}
        />
      </div>
    </Card>
  );
}

export default SliderSettings;
