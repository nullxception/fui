import { NumberInput } from "@/components/NumberInput";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useDiffusionConf } from "@/hooks/useDiffusionConfig";

function BatchCountSetting() {
  const modeStore = useDiffusionConf("batchMode");
  const countStore = useDiffusionConf("batchCount");
  return (
    <div className="flex items-center justify-between">
      <Label
        htmlFor="batchCount"
        className={!modeStore.value ? "opacity-50" : ""}
      >
        Batch size
      </Label>
      <NumberInput
        id="batchCount"
        min={2}
        step={1}
        value={countStore.value ?? 2}
        onChange={(e) => countStore.update(e)}
        className="w-30"
        disabled={!modeStore.value}
      />
    </div>
  );
}

function BatchModeSwitch() {
  const store = useDiffusionConf("batchMode");
  return (
    <div className="flex items-center justify-between py-2">
      <Label htmlFor="batchModeSwitch" className="cursor-pointer">
        Batch generation
      </Label>
      <Switch
        id="batchModeSwitch"
        checked={store.value ?? false}
        onCheckedChange={(e) => store.update(e)}
      />
    </div>
  );
}

export function BatchModeSetting() {
  return (
    <>
      <BatchModeSwitch />
      <BatchCountSetting />
    </>
  );
}
