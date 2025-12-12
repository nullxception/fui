import { AspectRatio } from "client/components/ui/aspect-ratio";
import { Skeleton } from "client/components/ui/skeleton";
import { Trash2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { SDImage } from "server/types";

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry === undefined) return;
      setWidth(entry.contentRect.width);
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

interface ThumbnailProps {
  image: SDImage;
  className?: string;
  onClick?: () => void;
  isSelectionMode?: boolean;
  selected?: boolean;
}

export function Thumbnail({
  image,
  className,
  onClick,
  selected,
  isSelectionMode,
}: ThumbnailProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [isLoaded, setIsLoaded] = useState(false);

  // derive appropriate thumbnail size based on real width
  const size = (() => {
    if (width < 192) return 192;
    if (width < 320) return 320;
    if (width < 480) return 480;
    return 512;
  })();

  return (
    <div
      ref={ref}
      onClick={onClick}
      className={`group relative w-full cursor-pointer break-inside-avoid overflow-hidden rounded-xl border bg-background transition-colors select-none ${className} ${selected ? "bg-pink-700 opacity-100" : "border-border"}`}
    >
      <AspectRatio ratio={image.width / image.height}>
        <img
          src={`${image.url}?width=${size}`}
          alt={image.name}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          className={`h-full w-full object-cover transition-transform duration-300 ${
            typeof onClick === "function" && "group-hover:scale-105"
          } ${!isLoaded && "opacity-0"} ${isSelectionMode && selected && "opacity-100"} ${isSelectionMode && !selected && "opacity-70"} `}
        />
      </AspectRatio>
      {!isLoaded && <Skeleton className="absolute inset-0" />}
      {isSelectionMode && selected && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-pink-700/50 p-2 text-primary-foreground">
            <Trash2Icon className="h-6 w-6" />
          </div>
        </div>
      )}
    </div>
  );
}
