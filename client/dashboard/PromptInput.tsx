import { useQuery } from "@tanstack/react-query";
import { Label } from "client/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "client/components/ui/select";
import { Textarea } from "client/components/ui/textarea";
import { useTRPC } from "client/query";
import { usePromptAttachment } from "client/settings/usePromptAttachment";
import React, { useLayoutEffect, useRef, useState } from "react";
import type { PromptAttachmentType } from "server/types";
import { usePromptState } from "./usePromptState";

type PromptType = "prompt" | "negativePrompt";

const ExtraSelector: React.FC<{
  onAddExtra: (filename: string) => void;
  extras: string[];
  type: PromptAttachmentType;
}> = ({ onAddExtra, extras, type }) => {
  const [value, setValue] = useState("");
  return (
    <Select
      value={value}
      onValueChange={(e) => {
        if (e) {
          onAddExtra(e);
          // reset value after selecting
          setTimeout(() => setValue(""));
        }
      }}
    >
      <SelectTrigger className="w-full" indicator="plus">
        <SelectValue
          placeholder={`Add ${type === "lora" ? "LoRA" : "Embedding"}`}
        />
      </SelectTrigger>
      <SelectContent>
        {extras.map((extra) => (
          <SelectItem key={extra} value={extra}>
            {extra}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

function autoResize(el: HTMLTextAreaElement) {
  requestAnimationFrame(() => {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  });
}

function Prompt({ type }: { type: PromptType }) {
  const rpc = useTRPC();
  const { data } = useQuery(rpc.listModels.queryOptions());
  const { value, changed, updatePrompt, forceSave } = usePromptState(type);
  const ref = useRef<HTMLTextAreaElement>(null);
  const { buildPrompt } = usePromptAttachment();
  const title = type === "prompt" ? "Prompt" : "Negative Prompt";

  const addAttachment = (filename: string, type: PromptAttachmentType) => {
    updatePrompt(buildPrompt(value, filename, type));
  };

  useLayoutEffect(() => {
    if (ref.current) {
      autoResize(ref.current);
    }
  }, [value]);

  return (
    <div className="space-y-2 px-4">
      <div className="flex items-center justify-between">
        <Label
          htmlFor={`${type}Text`}
          className={`${type === "prompt" ? "text-blue-500" : "text-pink-500"}`}
        >
          {title}
        </Label>
        <div className="flex items-center gap-2 text-xs">
          {changed && (
            <span className="flex items-center gap-1 text-foreground/90">
              <span className="h-2 w-2 animate-pulse rounded-full bg-foreground"></span>
              Saving...
            </span>
          )}
        </div>
      </div>
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
        className={`scrollbar-none ${
          type === "prompt"
            ? "focus-visible:ring-blue-500/50"
            : "focus-visible:ring-pink-500/50"
        }`}
        placeholder={`Enter your ${title.toLowerCase()} here...`}
        spellCheck={false}
      />
      <div className="grid grid-cols-2 gap-2">
        {data && (
          <ExtraSelector
            type="embedding"
            onAddExtra={(file) => addAttachment(file, "embedding")}
            extras={data?.embeddings}
          />
        )}
        {data && (
          <ExtraSelector
            type="lora"
            onAddExtra={(file) => addAttachment(file, "lora")}
            extras={data?.loras}
          />
        )}
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
