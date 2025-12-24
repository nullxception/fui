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
import { useDiffusionConf } from "@/hooks/useDiffusionConfig";
import { useTRPC } from "@/lib/query";
import { useQuery } from "@tanstack/react-query";
import { taeModelTypeSchema } from "server/types/diffusionparams";

function TAEModelTypeSelect({ disabled = true }: { disabled?: boolean }) {
  const store = useDiffusionConf("taeType");
  return (
    <div className="flex items-center justify-between py-2">
      <Label htmlFor="taeTypeSelect" className={disabled ? "opacity-50" : ""}>
        TAE Type
      </Label>
      <Select
        value={store.value ?? "taesd"}
        onValueChange={(e) => store.update(taeModelTypeSchema.parse(e))}
      >
        <SelectTrigger id="taeTypeSelect" disabled={disabled} className="w-1/2">
          <SelectValue placeholder="Select TAE Type" />
        </SelectTrigger>
        <SelectContent className="bg-background/80 p-1 backdrop-blur-xs">
          <SelectGroup>
            <SelectItem value="taesd">TAESD</SelectItem>
            <SelectItem value="taehv">TAEHV</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

function TAEModelSelect({ disabled = true }: { disabled?: boolean }) {
  const modelStore = useDiffusionConf("taeModel");
  const rpc = useTRPC();
  const { data } = useQuery(rpc.info.models.queryOptions());

  return (
    <div className="space-y-2 pt-2">
      <Label htmlFor="taesdSelect" className={disabled ? "opacity-50" : ""}>
        TAE Model
      </Label>
      <Select
        value={modelStore.value ?? ""}
        onValueChange={(e) => {
          if (e === "unset") {
            modelStore.unset();
            return;
          }
          modelStore.update(e);
        }}
      >
        <SelectTrigger disabled={disabled} id="taesdSelect" className="w-full">
          <SelectValue placeholder="Select TAESD" />
        </SelectTrigger>
        <SelectContent className="bg-background/80 p-1 backdrop-blur-xs">
          <SelectGroup>
            <SelectItem value="unset">unset</SelectItem>
            {data &&
              data.taes.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

export function TAESetting() {
  const store = useDiffusionConf("enableTae");
  return (
    <>
      <div className="flex items-center justify-between py-2">
        <Label htmlFor="taeSwitch" className="cursor-pointer">
          Use TinyAutoEncoder for latent decoding
        </Label>
        <Switch
          id="taeSwitch"
          checked={store.value ?? false}
          onCheckedChange={(e) => store.update(e)}
        />
      </div>
      <TAEModelTypeSelect disabled={!store.value} />
      <TAEModelSelect disabled={!store.value} />
    </>
  );
}
