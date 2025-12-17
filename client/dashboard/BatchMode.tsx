import { NumberInput } from "@/components/NumberInput";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useDiffusionConfig } from "./useDiffusionConfig";

export function BatchModeSetting() {
  const store = useDiffusionConfig();

  return (
    <>
      <div className="flex items-center justify-between py-2">
        <Label htmlFor="batchModeSwitch" className="cursor-pointer">
          Batch generation
        </Label>
        <Switch
          id="batchModeSwitch"
          checked={store.params.batchMode ?? false}
          onCheckedChange={(e) => store.update("batchMode", e)}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label
          htmlFor="batchCount"
          className={!store.params.batchMode ? "opacity-50" : ""}
        >
          Batch size
        </Label>
        <NumberInput
          id="batchCount"
          min={2}
          step={1}
          value={store.params.batchCount ?? 2}
          onChange={(e) => store.update("batchCount", e)}
          className="w-30"
          disabled={!store.params.batchMode}
        />
      </div>
    </>
  );
}
