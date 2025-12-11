import { DottedBackground } from "client/components/DottedBackground";
import { ImageIcon } from "lucide-react";
import type { Image } from "server/types";
import { Link } from "wouter";

interface ImageDisplayProps {
  image?: Image;
  isProcessing: boolean;
}

export function ImageDisplay({ image, isProcessing }: ImageDisplayProps) {
  return (
    <div className="flex h-[50vh] w-full flex-1 items-center justify-center bg-background/60 lg:h-full">
      <DottedBackground />
      {isProcessing ? (
        <div className="p-8 text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-t-2 border-b-2 border-primary"></div>
          <p className="animate-pulse text-muted-foreground">
            Generating image...
          </p>
        </div>
      ) : image ? (
        <Link
          href={`/gallery/${image.name}`}
          state={{ from: "~/" }}
          className="z-1 h-full w-full"
        >
          <img
            src={image.url}
            alt="Generated output"
            className="h-full w-full object-contain"
          />
        </Link>
      ) : (
        <div className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-background text-foreground">
            <ImageIcon className="h-12 w-12" />
          </div>
          <p className="mb-2 text-xl font-medium text-foreground">
            Ready to create
          </p>
          <p className="text-sm text-muted-foreground">
            Configure your settings and click Generate
          </p>
        </div>
      )}
    </div>
  );
}
