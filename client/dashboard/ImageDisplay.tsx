import { DottedBackground } from "client/components/DottedBackground";
import { Thumbnail } from "client/components/Thumbnail";
import { ImageIcon } from "lucide-react";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import type { SDImage } from "server/types";
import { Link, useLocation } from "wouter";

interface ImageDisplayProps {
  images?: SDImage[];
  isProcessing: boolean;
}

export function ImageDisplay({ images, isProcessing }: ImageDisplayProps) {
  const [, navigate] = useLocation();
  return (
    <div className="flex h-[50vh] w-full flex-1 items-center justify-center lg:h-full">
      <DottedBackground />
      {isProcessing && (
        <div className="p-8 text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-t-2 border-b-2 border-primary"></div>
          <p className="animate-pulse text-muted-foreground">
            Generating image...
          </p>
        </div>
      )}
      {images && images.length === 1 && (
        <Link
          href={`/gallery/${images?.[0]?.name}`}
          state={{ from: "~/" }}
          className="z-1 h-full w-full"
        >
          <img
            src={images?.[0]?.url}
            alt="Generated output"
            className="h-full w-full object-contain"
            onClick={() =>
              navigate(`~/gallery/${images?.[0]?.name}`, {
                state: { from: "~/" },
              })
            }
          />
        </Link>
      )}
      {images && images.length > 1 && (
        <ResponsiveMasonry
          columnsCountBreakPoints={{ 350: 2 }}
          gutterBreakPoints={{ 350: "6px" }}
          className={`scrollbar-thin h-full w-full overflow-y-auto px-2 py-2`}
        >
          <Masonry className="">
            {images.map((img) => (
              <Thumbnail
                image={img}
                key={img.name}
                className="rounded-md"
                onClick={() =>
                  navigate(`~/gallery/${img.name}`, { state: { from: "~/" } })
                }
              />
            ))}
          </Masonry>
        </ResponsiveMasonry>
      )}
      {!isProcessing && (!images || images.length === 0) && (
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
