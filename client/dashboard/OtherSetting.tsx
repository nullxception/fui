import { SliderInput } from "@/components/SliderInput";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTRPC } from "@/query";
import { useQuery } from "@tanstack/react-query";
import { useDiffusionConfig } from "./useDiffusionConfig";

export function OtherSetting() {
  const store = useDiffusionConfig();
  const rpc = useTRPC();
  const { data: sysinfo } = useQuery(rpc.sysInfo.queryOptions());
  return (
    <>
      {sysinfo && (
        <SliderInput
          label={`Threads ${store.params.threads < 1 ? ": Auto" : ""}`}
          min={0}
          max={sysinfo.cpuCount}
          value={store.params.threads}
          onChange={(e) => store.update("threads", e)}
        />
      )}

      <div className="flex items-center justify-between py-2">
        <Label htmlFor="diffusionFaSwitch" className="cursor-pointer">
          Flash Attention
        </Label>
        <Switch
          id="diffusionFaSwitch"
          checked={store.params.diffusionFa ?? false}
          onCheckedChange={(e) => store.update("diffusionFa", e)}
        />
      </div>

      <div className="flex items-center justify-between py-2">
        <Label htmlFor="offloadToCpuSwitch" className="cursor-pointer">
          Offload weights to (CPU) RAM
        </Label>
        <Switch
          id="offloadToCpuSwitch"
          checked={store.params.offloadToCpu ?? false}
          onCheckedChange={(e) => store.update("offloadToCpu", e)}
        />
      </div>

      <div className="flex items-center justify-between py-2">
        <Label htmlFor="forceSdxlVaeConvScaleSwitch" className="cursor-pointer">
          Use SDXL VAE conv scale
        </Label>
        <Switch
          id="forceSdxlVaeConvScaleSwitch"
          checked={store.params.forceSdxlVaeConvScale ?? false}
          onCheckedChange={(e) => store.update("forceSdxlVaeConvScale", e)}
        />
      </div>

      <div className="flex items-center justify-between py-2">
        <Label htmlFor="diffusionConvDirectSwitch" className="cursor-pointer">
          Diffusion ggml_conv2d_direct
        </Label>
        <Switch
          id="diffusionConvDirectSwitch"
          checked={store.params.diffusionConvDirect ?? false}
          onCheckedChange={(e) => store.update("diffusionConvDirect", e)}
        />
      </div>

      <div className="flex items-center justify-between py-2">
        <Label htmlFor="vaeConvDirectSwitch" className="cursor-pointer">
          VAE ggml_conv2d_direct
        </Label>
        <Switch
          id="vaeConvDirectSwitch"
          checked={store.params.vaeConvDirect ?? false}
          onCheckedChange={(e) => store.update("vaeConvDirect", e)}
        />
      </div>

      <div className="flex items-center justify-between py-2">
        <Label htmlFor="verboseSwitch" className="cursor-pointer">
          Verbose console output
        </Label>
        <Switch
          id="verboseSwitch"
          checked={store.params.verbose ?? false}
          onCheckedChange={(e) => store.update("verbose", e)}
        />
      </div>
    </>
  );
}
