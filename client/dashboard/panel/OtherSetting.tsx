import { SliderInput } from "@/components/SliderInput";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useDiffusionConf } from "@/hooks/useDiffusionConfig";
import { useTRPC } from "@/lib/query";
import { useQuery } from "@tanstack/react-query";

function ThreadsInput() {
  const store = useDiffusionConf("threads");
  const rpc = useTRPC();
  const { data: sysinfo } = useQuery(rpc.info.sys.queryOptions());

  if (!sysinfo) return null;

  return (
    <SliderInput
      label={`Threads ${store.value < 1 ? ": Auto" : ""}`}
      min={0}
      max={sysinfo.cpuCount}
      value={store.value}
      onChange={(e) => store.update(e)}
    />
  );
}

function FlashAttentionSwitch() {
  const store = useDiffusionConf("diffusionFa");
  return (
    <div className="flex items-center justify-between py-2">
      <Label htmlFor="diffusionFaSwitch" className="cursor-pointer">
        Flash Attention
      </Label>
      <Switch
        id="diffusionFaSwitch"
        checked={store.value ?? false}
        onCheckedChange={(e) => store.update(e)}
      />
    </div>
  );
}

function OffloadToCpuSwitch() {
  const store = useDiffusionConf("offloadToCpu");
  return (
    <div className="flex items-center justify-between py-2">
      <Label htmlFor="offloadToCpuSwitch" className="cursor-pointer">
        Offload weights to RAM
      </Label>
      <Switch
        id="offloadToCpuSwitch"
        checked={store.value ?? false}
        onCheckedChange={(e) => store.update(e)}
      />
    </div>
  );
}

function ClipOnCpuSwitch() {
  const store = useDiffusionConf("clipOnCpu");
  return (
    <div className="flex items-center justify-between py-2">
      <Label htmlFor="clipOnCpuSwitch" className="cursor-pointer">
        Offload CLIP to CPU
      </Label>
      <Switch
        id="clipOnCpuSwitch"
        checked={store.value ?? false}
        onCheckedChange={(e) => store.update(e)}
      />
    </div>
  );
}

function VaeOnCpuSwitch() {
  const store = useDiffusionConf("vaeOnCpu");
  return (
    <div className="flex items-center justify-between py-2">
      <Label htmlFor="vaeOnCpuSwitch" className="cursor-pointer">
        Offload VAE to CPU
      </Label>
      <Switch
        id="vaeOnCpuSwitch"
        checked={store.value ?? false}
        onCheckedChange={(e) => store.update(e)}
      />
    </div>
  );
}

function SdxlVaeConvScaleSwitch() {
  const store = useDiffusionConf("forceSdxlVaeConvScale");
  return (
    <div className="flex items-center justify-between py-2">
      <Label htmlFor="forceSdxlVaeConvScaleSwitch" className="cursor-pointer">
        Use SDXL VAE conv scale
      </Label>
      <Switch
        id="forceSdxlVaeConvScaleSwitch"
        checked={store.value ?? false}
        onCheckedChange={(e) => store.update(e)}
      />
    </div>
  );
}

function DiffusionConvDirectSwitch() {
  const store = useDiffusionConf("diffusionConvDirect");
  return (
    <div className="flex items-center justify-between py-2">
      <Label htmlFor="diffusionConvDirectSwitch" className="cursor-pointer">
        Diffusion ggml_conv2d_direct
      </Label>
      <Switch
        id="diffusionConvDirectSwitch"
        checked={store.value ?? false}
        onCheckedChange={(e) => store.update(e)}
      />
    </div>
  );
}

function VaeConvDirectSwitch() {
  const store = useDiffusionConf("vaeConvDirect");
  return (
    <div className="flex items-center justify-between py-2">
      <Label htmlFor="vaeConvDirectSwitch" className="cursor-pointer">
        VAE ggml_conv2d_direct
      </Label>
      <Switch
        id="vaeConvDirectSwitch"
        checked={store.value ?? false}
        onCheckedChange={(e) => store.update(e)}
      />
    </div>
  );
}

function VerboseSwitch() {
  const store = useDiffusionConf("verbose");
  return (
    <div className="flex items-center justify-between py-2">
      <Label htmlFor="verboseSwitch" className="cursor-pointer">
        Verbose console output
      </Label>
      <Switch
        id="verboseSwitch"
        checked={store.value ?? false}
        onCheckedChange={(e) => store.update(e)}
      />
    </div>
  );
}

export function OtherSetting() {
  return (
    <>
      <ThreadsInput />
      <FlashAttentionSwitch />
      <OffloadToCpuSwitch />
      <ClipOnCpuSwitch />
      <VaeOnCpuSwitch />
      <SdxlVaeConvScaleSwitch />
      <DiffusionConvDirectSwitch />
      <VaeConvDirectSwitch />
      <VerboseSwitch />
    </>
  );
}
