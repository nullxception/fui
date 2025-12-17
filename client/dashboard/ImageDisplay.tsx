import { Thumbnail } from "@/components/Thumbnail";
import { useTRPC } from "@/query";
import { useQuery } from "@tanstack/react-query";
import { ImageIcon } from "lucide-react";
import { motion } from "motion/react";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import { useLocation } from "wouter";

interface ImageDisplayProps {
  imageUrls: string[];
  isProcessing: boolean;
}

const AnimationSettings = {
  transition: { duration: 0.3 },
  initial: { opacity: 0, x: 100 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 100 },
};

export function ImageDisplay({ imageUrls, isProcessing }: ImageDisplayProps) {
  const [, navigate] = useLocation();
  const rpc = useTRPC();
  const { data: images } = useQuery(rpc.getImagesInfo.queryOptions(imageUrls));
  return (
    <div className="flex h-[50vh] w-full flex-1 items-center justify-center lg:h-full">
      {isProcessing && (
        <motion.div
          key="loadingOverlay"
          {...AnimationSettings}
          className="absolute z-2 flex h-full w-full flex-col items-center justify-center p-8 text-center"
        >
          <div className="absolute h-full w-full animate-pulse bg-background/70"></div>
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-t-2 border-b-2 border-t-purple-500 border-b-blue-400 text-foreground"></div>
          <p className="z-1 text-foreground delay-75 delay-initial">
            Generating image...
          </p>
        </motion.div>
      )}
      {images && images.length === 1 && (
        <motion.img
          {...AnimationSettings}
          src={`${images?.[0]?.url}?preview`}
          alt="Generated output"
          className="z-1 h-full w-full object-contain"
          onClick={() => navigate(`~/result/${images?.[0]?.name}`)}
        />
      )}
      {images && images.length > 1 && (
        <motion.div
          {...AnimationSettings}
          className={`scrollbar-thin flex h-full w-full items-center-safe overflow-y-auto px-2 py-2`}
        >
          <ResponsiveMasonry
            columnsCountBreakPoints={{ 350: 2 }}
            gutterBreakPoints={{ 350: "6px" }}
            className={`flex h-full w-full items-center-safe`}
          >
            <Masonry className="">
              {images.map((img) => (
                <Thumbnail
                  image={img}
                  key={img.name}
                  className="rounded-md"
                  onClick={() => navigate(`~/result/${img.name}`)}
                />
              ))}
            </Masonry>
          </ResponsiveMasonry>
        </motion.div>
      )}
      {!isProcessing && (!images || images.length === 0) && (
        <motion.div {...AnimationSettings} className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full border border-border bg-background text-foreground backdrop-blur-sm">
            <ImageIcon className="h-12 w-12" />
          </div>
          <p className="mb-2 text-xl font-medium text-foreground">
            Ready to create
          </p>
          <p className="text-sm text-muted-foreground">
            Configure your settings and click Generate
          </p>
        </motion.div>
      )}
    </div>
  );
}
