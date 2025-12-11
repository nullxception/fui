import { Footer } from "client/components/Footer";
import { Card } from "client/components/ui/card";
import { GenerationSettings } from "./GenerationSettings";
import { ModelSelector } from "./ModelSelector";
import { PromptInput } from "./PromptInput";

export function ControlPanel({ className }: { className?: string }) {
  return (
    <div className={`flex flex-col items-stretch lg:max-h-screen ${className}`}>
      <Card className="scrollbar-thin flex-1 space-y-4 overflow-y-auto py-4 backdrop-blur-md scrollbar-thumb-secondary scrollbar-track-transparent lg:max-h-full lg:shrink-0">
        <ModelSelector />
        <PromptInput />
        <GenerationSettings />
      </Card>
      <Footer />
    </div>
  );
}
