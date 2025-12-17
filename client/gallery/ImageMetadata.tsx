import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/ui/shadcn-io/copy-button";
import { useDiffusionConfig } from "@/dashboard/useDiffusionConfig";
import { usePreviewImage } from "@/stores/usePreviewImage";
import {
  ChevronDownIcon,
  DownloadIcon,
  RefreshCcwIcon,
  TrashIcon,
} from "lucide-react";
import { motion } from "motion/react";
import type { SDImage } from "server/types";
import type { SDImageParams } from "server/types/image";
import { useLocation } from "wouter";

async function saveImage(image: SDImage) {
  try {
    const response = await fetch(image.url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const url = response.url;
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = url.substring(url.lastIndexOf("/") + 1);
    link.click();

    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Error downloading the image:", error);
  }
}

interface ImageMetadataProps {
  image: SDImage;
  onRemove: () => void;
  onClose: () => void;
  className?: string;
}

function BaseMetadataChip({
  data,
  title,
  className = "",
}: {
  data?: string | number | boolean | string[];
  title: string;
  className?: string;
}) {
  const value = data;
  if (
    typeof value === "undefined" ||
    (Array.isArray(value) && value.length < 1) ||
    (typeof value === "string" && value.trim().length < 1)
  )
    return null;

  const copiedContent = () => {
    if (Array.isArray(value)) {
      return value.join("\n");
    }

    return value.toString().trim();
  };

  return (
    <div className="group rounded border border-border/50 bg-background/50 p-2">
      <div className="flex flex-row items-center justify-between">
        <Label
          className={`mb-1 block text-[10px] tracking-wider text-gray-300 uppercase ${className}`}
        >
          {title}
        </Label>
        <CopyButton
          variant="ghost"
          size="sm"
          content={copiedContent()}
          className="opacity-0 group-hover:opacity-100"
        />
      </div>
      <p className="text-gray truncate font-mono text-xs whitespace-pre-wrap">
        {Array.isArray(value)
          ? value.map((v, i) => (
              <span className="block" key={i}>
                {v}
              </span>
            ))
          : value?.toString()?.trim()}
      </p>
    </div>
  );
}

function MetadataChip({
  data: metadata,
  metakey,
  className = "",
}: {
  data: SDImageParams;
  metakey: keyof SDImageParams;
  className?: string;
}) {
  return (
    <BaseMetadataChip
      data={metadata[metakey]}
      title={metakey.split(/(?=[A-Z])/).join(" ")}
      className={className}
    />
  );
}

const variants = {
  enter: (w: number) => ({
    width: w >= 768 ? 0 : "auto",
    height: w >= 768 ? "auto" : 0,
  }),
  animate: {
    width: "auto",
    height: "auto",
  },
  exit: (w: number) => ({
    width: w >= 768 ? 0 : "auto",
    height: w >= 768 ? "auto" : 0,
  }),
};

export default function ImageMetadata({
  image,
  onRemove,
  onClose,
  className = "",
}: ImageMetadataProps) {
  const [, navigate] = useLocation();
  const store = useDiffusionConfig();
  const metadata = image.metadata;

  const handleRemake = () => {
    if (!metadata) return;

    // Map parsed metadata to diffusion config parameters
    store.updateAll({
      prompt: metadata.prompt,
      negativePrompt: metadata.negativePrompt,
      steps: metadata.steps,
      cfgScale: metadata.cfgScale,
      width: metadata.baseWidth,
      height: metadata.baseHeight,
      samplingMethod: metadata.samplingMethod,
      scheduler: metadata.scheduler,
      model: metadata.model,
      vae: metadata.vae,
    });

    // Navigate back to generate tab
    usePreviewImage.getState().setPreviewImages("gallery", [image.url]);
    navigate("~/");
    onClose();
  };

  return (
    <motion.div
      custom={window.innerWidth}
      variants={variants}
      initial="enter"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3, ease: "easeInOut" }}
      style={{ overflow: "hidden" }}
      className="relative"
    >
      <Button
        variant="ghost"
        size="icon-lg"
        className="absolute top-4 right-5 z-3 flex bg-background/20 text-background/70 hover:text-foreground lg:hidden"
        onClick={onClose}
      >
        <ChevronDownIcon className="text-foreground" />
      </Button>
      <div
        className={`bg-surface/95 scrollbar-thin flex h-[65vh] w-full flex-col gap-2 overflow-y-auto rounded-t-lg border-border bg-clip-border px-4 backdrop-blur-sm scrollbar-thumb-secondary scrollbar-track-transparent md:h-full md:w-100 md:rounded-none md:border-l ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between py-2 pt-4">
          <h3 className="p-0 text-lg font-light text-foreground">Details</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs tracking-wider text-muted-foreground uppercase">
              Created
            </Label>
            <p className="font-mono text-sm text-foreground">
              {new Date(image.mtime).toLocaleString()}
            </p>
          </div>
          <div className="space-y-2 space-x-2">
            <Button onClick={onRemove} size="sm" variant="destructive">
              <TrashIcon /> Delete
            </Button>
            {metadata && (
              <Button onClick={handleRemake} size="sm" variant="default">
                <RefreshCcwIcon /> Remake
              </Button>
            )}
            <Button onClick={() => saveImage(image)} variant="outline">
              <DownloadIcon /> Download
            </Button>
          </div>
          {metadata ? (
            <div className="space-y-2">
              <MetadataChip
                data={metadata}
                metakey="prompt"
                className="text-blue-400"
              />
              <MetadataChip
                data={metadata}
                metakey="negativePrompt"
                className="text-pink-400"
              />
              <MetadataChip
                data={metadata}
                metakey="model"
                className="text-purple-400"
              />
              <MetadataChip
                data={metadata}
                metakey="vae"
                className="text-purple-400"
              />
              <MetadataChip
                data={metadata}
                metakey="textEncoders"
                className="text-purple-400"
              />
              <div className="grid grid-cols-2 gap-3">
                <BaseMetadataChip data={image.width} title="width" />
                <BaseMetadataChip data={image.height} title="height" />
                <MetadataChip data={metadata} metakey="upscaled" />
                {metadata.upscaled && (
                  <MetadataChip data={metadata} metakey="baseWidth" />
                )}
                {metadata.upscaled && (
                  <MetadataChip data={metadata} metakey="baseHeight" />
                )}
                <MetadataChip data={metadata} metakey="steps" />
                <MetadataChip data={metadata} metakey="cfgScale" />
                <MetadataChip data={metadata} metakey="seed" />
                <MetadataChip data={metadata} metakey="rng" />
                <MetadataChip data={metadata} metakey="samplingMethod" />
                <MetadataChip data={metadata} metakey="scheduler" />
                <MetadataChip data={metadata} metakey="version" />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No metadata found.
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
