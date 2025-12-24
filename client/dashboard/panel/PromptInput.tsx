import { Label } from "@/components/ui/label";
import {
  Select,
  SelectAddTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/lib/query";
import { cn } from "@/lib/utils";
import { usePromptAttachment } from "@/settings/usePromptAttachment";
import { useQuery } from "@tanstack/react-query";
import { FilePlusIcon, PackagePlusIcon } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PromptAttachmentType } from "server/types";
import { usePromptState } from "./usePromptState";

type PromptType = "prompt" | "negativePrompt";

function PromptAttachmentSelector({
  onAdd,
  attachments,
  type,
}: {
  onAdd: (filename: string) => void;
  attachments: string[];
  type: PromptAttachmentType;
}) {
  const [value, setValue] = useState("");
  return (
    <Select
      value={value}
      onValueChange={(e) => {
        if (e) {
          onAdd(e);
          // reset value after selecting
          setValue("");
        }
      }}
    >
      <SelectAddTrigger
        className="border-0"
        size="sm"
        icon={type === "lora" ? PackagePlusIcon : FilePlusIcon}
      >
        <SelectValue
          placeholder={`Add ${type === "lora" ? "LoRA" : "Embedding"}`}
        />
      </SelectAddTrigger>
      <SelectContent className="bg-background/80 p-1 backdrop-blur-xs">
        {attachments.map((extra) => (
          <SelectItem key={extra} value={extra}>
            {extra.replace(/\.(safetensors|ckpt)$/, "")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function autoResize(el: HTMLTextAreaElement) {
  requestAnimationFrame(() => {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  });
}

function Prompt({ type }: { type: PromptType }) {
  const rpc = useTRPC();
  const { data } = useQuery(rpc.info.models.queryOptions());
  const { value, changed, updatePrompt, forceSave } = usePromptState(type);
  const ref = useRef<HTMLTextAreaElement>(null);
  const { buildPrompt } = usePromptAttachment();
  const title = type === "prompt" ? "Prompt" : "Negative Prompt";
  const boxRef = useRef<HTMLDivElement>(null);

  const addAttachment = (filename: string, type: PromptAttachmentType) => {
    updatePrompt(buildPrompt(value, filename, type));
  };

  useLayoutEffect(() => {
    if (ref.current) {
      autoResize(ref.current);
    }
  }, [value]);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry === undefined) return;
      if (ref.current) {
        autoResize(ref.current);
      }
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={boxRef} className="space-y-2 px-4">
      <div className="flex items-center justify-between">
        <Label
          htmlFor={`${type}Text`}
          className={cn(
            "py-1",
            type === "prompt" ? "text-blue-500" : "text-pink-500",
          )}
        >
          {title}
        </Label>
        <div
          className={`flex animate-pulse items-center gap-1 px-2 text-xs text-foreground/90 transition-all duration-150 ${changed ? "scale-90" : "scale-0"}`}
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-foreground"></span>
          Saving...
        </div>
      </div>
      <div className="relative">
        <Textarea
          id={`${type}Text`}
          ref={ref}
          value={value}
          onChange={(e) => {
            updatePrompt(e.target.value);
          }}
          onBlur={(e) => {
            forceSave();
            autoResize(e.target);
          }}
          className={cn(
            "scrollbar-none resize-none pb-12 font-mono text-[12px]!",
            type === "prompt"
              ? "focus-visible:ring-blue-500/50"
              : "focus-visible:ring-pink-500/50",
          )}
          placeholder={`Enter your ${title.toLowerCase()} here...`}
          spellCheck={false}
        />
        <div className="absolute bottom-0 flex w-full overflow-clip p-1">
          {data && (
            <PromptAttachmentSelector
              type="embedding"
              onAdd={(file) => addAttachment(file, "embedding")}
              attachments={data?.embeddings}
            />
          )}
          {data && (
            <PromptAttachmentSelector
              type="lora"
              onAdd={(file) => addAttachment(file, "lora")}
              attachments={data?.loras}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function PromptInput() {
  return (
    <div className="flex flex-col space-y-4">
      <Prompt type="prompt" />
      <Prompt type="negativePrompt" />
    </div>
  );
}
