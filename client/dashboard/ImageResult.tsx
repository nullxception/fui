import Modal from "@/components/Modal";
import { RemoveImagesDialog } from "@/components/RemoveImagesDialog";
import { Thumbnail } from "@/components/Thumbnail";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useImageQuery } from "@/hooks/useImageQuery";
import { JobQueryContext } from "@/hooks/useJobQuery";
import { usePreviewImage } from "@/hooks/usePreviewImage";
import { saveImage } from "@/lib/image";
import { useTRPC } from "@/lib/query";
import type { Timeout } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { formatDuration, intervalToDuration } from "date-fns";
import {
  ClockIcon,
  DownloadIcon,
  ImageIcon,
  ImagesIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useContext, useEffect, useRef, useState } from "react";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import type { Job } from "server/types";
import { useLocation } from "wouter";
import { useShallow } from "zustand/react/shallow";

function getCompletionTime(job: Job) {
  if (!job.completedAt) return;
  const start = new Date(job.createdAt);
  const end = new Date(job.completedAt);
  const duration = intervalToDuration({ start, end });
  const units = { xHours: "h", xMinutes: "m", xSeconds: "s" };
  return formatDuration(duration, {
    format: ["hours", "minutes", "seconds"],
    delimiter: " ",
    locale: {
      formatDistance: (token, count) => {
        const unit = Object.entries(units).find(([k]) => k === token)?.[1];
        return unit ? `${count}${unit}` : "";
      },
    },
  });
}

export function CompletionTime() {
  const { job } = useContext(JobQueryContext);
  const { urls, from } = usePreviewImage(
    useShallow((s) => ({ urls: s.urls, from: s.from })),
  );

  const last = from === "txt2img" && job?.status === "completed" ? job : null;
  const compTime =
    urls?.[0] && last?.result?.includes(urls?.[0]) && getCompletionTime(last);

  const compTimeRef = useRef<Timeout | null>(null);

  const [showCompTime, setShowCompTime] = useState<boolean | null>(null);
  useEffect(() => {
    if (!compTime || showCompTime !== null) return;
    if (compTimeRef.current) clearTimeout(compTimeRef.current);
    compTimeRef.current = setTimeout(() => {
      if (showCompTime === null) {
        setShowCompTime(false);
      }
    }, 2000);
  }, [from, compTime, showCompTime]);

  if (!compTime) return null;

  return (
    <div
      onClick={() =>
        setShowCompTime(showCompTime === null ? false : !showCompTime)
      }
      className={`absolute right-2 bottom-2 z-2 flex cursor-pointer flex-row items-center justify-center gap-2 rounded-xl border border-primary bg-primary/50 px-1.5 py-0.5 text-xs font-semibold backdrop-blur-xs select-none ${
        showCompTime !== false ? "opacity-100" : "opacity-50 hover:opacity-100"
      } transition-opacity duration-300`}
    >
      <AnimatePresence>
        {showCompTime !== false && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            className="overflow-clip text-nowrap"
          >
            Completed in {compTime}
          </motion.div>
        )}
      </AnimatePresence>
      <ClockIcon className="w-4" />
    </div>
  );
}

const AnimationSettings = {
  initial: { opacity: 0, x: 100 },
  animate: { opacity: 1, x: 0 },
};

export function ImageResult() {
  const { job } = useContext(JobQueryContext);
  const isProcessing = job?.status === "running";
  const [, navigate] = useLocation();
  const rpc = useTRPC();
  const { urls } = usePreviewImage(useShallow((s) => ({ urls: s.urls })));
  const { data } = useQuery(rpc.images.byUrls.queryOptions(urls ?? []));
  const images = data ?? [];
  const { removeImages } = useImageQuery();
  const [selectedImages, setSelectedImages] = useState<Array<string>>([]);
  const [trashQueue, setTrashQueue] = useState<Array<string>>([]);
  const toggleSelection = (name: string) => {
    setSelectedImages(
      selectedImages.includes(name)
        ? selectedImages.filter((it) => it !== name)
        : [...selectedImages, name],
    );
  };

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
      {images.length === 1 && (
        <ContextMenu key={images[0]?.name}>
          <ContextMenuTrigger className="inset-0 z-1 h-full w-full object-contain">
            <motion.img
              {...AnimationSettings}
              src={`${images[0]?.url}?preview`}
              alt="Generated output"
              className="z-1 h-full w-full object-contain"
              onClick={() => navigate(`~/result/${images[0]?.name}`)}
            />
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem
              className="gap-2"
              onClick={() => images[0]?.url && setTrashQueue([images[0].url])}
            >
              <Trash2Icon />
              Remove
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      )}
      {images.length > 1 && (
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
                <ContextMenu key={img.name}>
                  <ContextMenuTrigger
                    disabled={selectedImages.length > 0}
                    className="inset-0 w-full rounded-md"
                  >
                    <Thumbnail
                      image={img}
                      className="rounded-md"
                      isSelectionMode={selectedImages.length > 0}
                      selected={selectedImages.includes(img.url)}
                      onClick={() => {
                        if (selectedImages.length > 0) {
                          toggleSelection(img.url);
                        } else {
                          navigate(`~/result/${img.name}`);
                        }
                      }}
                    />
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => saveImage(img)}>
                      <DownloadIcon /> Download
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => setTrashQueue([img.url])}>
                      <Trash2Icon />
                      Remove
                    </ContextMenuItem>
                    {selectedImages.length === 0 && (
                      <ContextMenuItem
                        onClick={() => toggleSelection(img.url)}
                        variant="destructive"
                      >
                        <ImagesIcon />
                        Bulk Remove
                      </ContextMenuItem>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </Masonry>
          </ResponsiveMasonry>
        </motion.div>
      )}
      {!isProcessing && images.length === 0 && (
        <motion.div {...AnimationSettings} className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full border border-border bg-background text-foreground backdrop-blur-xs">
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
      {selectedImages.length > 0 && (
        <motion.div className="absolute bottom-13 left-1/2 -translate-x-1/2">
          <ButtonGroup className="overflow-clip rounded-md bg-background/80 backdrop-blur-xs">
            <Button
              variant="destructive"
              onClick={() => setTrashQueue(selectedImages)}
              size="lg"
              disabled={!(selectedImages.length > 0)}
            >
              <Trash2Icon /> Remove ({selectedImages.length})
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedImages([]);
              }}
              size="lg"
              className="bg-background"
            >
              <XIcon /> Cancel
            </Button>
          </ButtonGroup>
        </motion.div>
      )}
      <CompletionTime />
      <Modal isOpen={trashQueue.length > 0} onClose={() => setTrashQueue([])}>
        <RemoveImagesDialog
          images={images.filter((img) => trashQueue.includes(img.url))}
          onRemove={() => removeImages(trashQueue)}
          onRemoved={() => {
            setSelectedImages([]);
            setTrashQueue([]);
          }}
          onCancel={() => setTrashQueue([])}
        />
      </Modal>
    </div>
  );
}
