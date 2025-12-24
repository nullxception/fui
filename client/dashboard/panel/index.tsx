import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { BatchModeSetting } from "./BatchMode";
import { GenerationSettings } from "./GenerationSettings";
import { ModelSelector } from "./ModelSelector";
import { OtherSetting } from "./OtherSetting";
import { PromptInput } from "./PromptInput";
import { RNGSetting, SamplerRngSetting, SeedSetting } from "./RNGSetting";
import { TAESetting } from "./TAESetting";
import { UpscalerSetting } from "./UpscalerSetting";

export function ControlPanel({ className }: { className?: string }) {
  return (
    <div className={`flex flex-col items-stretch lg:max-h-screen ${className}`}>
      <Card className="scrollbar-thin flex-1 gap-0 space-y-4 overflow-y-auto py-4 backdrop-blur-xs scrollbar-thumb-secondary scrollbar-track-transparent lg:max-h-full lg:shrink-0">
        <ModelSelector />
        <PromptInput />
        <div className="grid gap-4 px-4 sm:grid-cols-1 md:grid-cols-2">
          <GenerationSettings />
          <RNGSetting />
          <SamplerRngSetting />
          <SeedSetting />
          <BatchModeSetting />
          <UpscalerSetting />
          <TAESetting />
          <OtherSetting />
        </div>
      </Card>
      <Footer />
    </div>
  );
}
