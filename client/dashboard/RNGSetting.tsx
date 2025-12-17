import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DicesIcon, RotateCcwIcon } from "lucide-react";
import { useDiffusionConfig } from "./useDiffusionConfig";

export function RNGSetting() {
  const store = useDiffusionConfig();

  const rngOptions = ["std_default", "cuda", "cpu"];
  return (
    <>
      <div className="space-y-4">
        <Label htmlFor="rngSelect">RNG</Label>
        <Select
          value={store.params.rng ?? ""}
          onValueChange={(e) => store.update("rng", e)}
        >
          <SelectTrigger id="rngSelect" className="w-full">
            <SelectValue placeholder={`RNG`} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {rngOptions.map((rng) => (
                <SelectItem key={rng} value={rng}>
                  {rng}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <Label htmlFor="samplerRng">Sampler RNG</Label>
        <Select
          value={store.params.samplerRng ?? ""}
          onValueChange={(e) => store.update("samplerRng", e)}
        >
          <SelectTrigger id="samplerRng" className="w-full">
            <SelectValue placeholder={`Sampler RNG`} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {rngOptions.map((rng) => (
                <SelectItem key={rng} value={rng}>
                  {rng}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <Label htmlFor="seedInput">Seed</Label>
        <InputGroup>
          <InputGroupButton
            type="button"
            onClick={() =>
              store.update("seed", Math.floor(Math.random() * 9999999 + 1))
            }
            className="mr-2"
            title="Random Seed"
          >
            <DicesIcon />
          </InputGroupButton>
          <InputGroupInput
            id="seedInput"
            type="number"
            value={store.params.seed}
            onChange={(e) => store.update("seed", parseInt(e.target.value))}
            placeholder="-1 for random"
          />
          <InputGroupButton
            type="button"
            onClick={() => store.update("seed", -1)}
            className="mr-2"
            title="Random Seed"
          >
            <RotateCcwIcon />
          </InputGroupButton>
        </InputGroup>
      </div>
    </>
  );
}
