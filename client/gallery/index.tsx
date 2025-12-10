import { Footer } from "client/components/Footer";
import { Logo } from "client/components/Header";
import Modal from "client/components/Modal";
import { Button } from "client/components/ui/button";
import { ButtonGroup } from "client/components/ui/button-group";
import { Skeleton } from "client/components/ui/skeleton";
import { AnimatePresence, motion, type HTMLMotionProps } from "framer-motion";
import { ImageIcon, Trash2Icon, XIcon } from "lucide-react";
import { forwardRef, useEffect, useRef, useState } from "react";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import type { Image } from "server/types";
import { useLocation, useRoute } from "wouter";
import ImageLightbox from "./ImageLightbox";
import { RemoveDialog } from "./RemoveDialog";
import { useImageQuery } from "./useImageQuery";

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

interface GalleryItemProps {
  image: Image;
  selected?: boolean;
  className: string;
  isSelectionMode: boolean;
  onClick: () => void;
}

function GalleryItem({
  image,
  selected,
  className,
  isSelectionMode,
  onClick,
}: GalleryItemProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [isLoaded, setIsLoaded] = useState(false);

  // derive appropriate thumbnail size based on real width
  const size = (() => {
    if (width < 192) return 192;
    if (width < 320) return 320;
    if (width < 480) return 480;
    return 512;
  })();
  const paddingTopPercentage = (image.height / image.width) * 100;

  return (
    <div
      ref={ref}
      onClick={onClick}
      className={`group bg-surface relative w-full cursor-pointer break-inside-avoid overflow-hidden rounded-xl border transition-colors select-none ${className} ${selected ? "bg-pink-700 opacity-100" : "border-border"}`}
    >
      <div
        className="block"
        style={{ paddingTop: `${paddingTopPercentage}%` }}
      />
      <img
        src={`${image.url}?width=${size}`}
        alt=""
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        className={`absolute inset-0 h-full w-full rounded-lg object-cover transition-transform duration-300 group-hover:scale-105 ${!isLoaded && "opacity-0"} ${isSelectionMode && selected && "opacity-100"} ${isSelectionMode && !selected && "opacity-70"} `}
      />
      {!isLoaded && <Skeleton className="absolute inset-0 rounded-lg" />}
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

export const Gallery = forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(
  (props, ref) => {
    const {
      data,
      error,
      fetchNextPage,
      hasNextPage,
      isFetching,
      isFetchingNextPage,
      status,
      images,
      removeImages,
    } = useImageQuery();
    const [match] = useRoute("/gallery");
    const [, params] = useRoute("/gallery/:id");
    const [appScrollTop, setAppScrollTop] = useState(0);
    const observerTarget = useRef(null);
    const [, navigate] = useLocation();
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedImages, setSelectedImages] = useState<Set<string>>(
      new Set(),
    );
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const toggleSelection = (name: string) => {
      const newSelected = new Set(selectedImages);
      if (newSelected.has(name)) {
        newSelected.delete(name);
      } else {
        newSelected.add(name);
      }
      setSelectedImages(newSelected);
    };

    const handleBatchDelete = () => {
      setShowDeleteDialog(true);
    };

    const confirmDelete = () => {
      removeImages(Array.from(selectedImages));
      setIsSelectionMode(false);
      setSelectedImages(new Set());
      setShowDeleteDialog(false);
    };

    useEffect(() => {
      const app = document.querySelector("#app");
      if (match && app && appScrollTop > 0) {
        // scroll saved scrollTop after going back from /gallery/:id
        app.scrollTop = appScrollTop;
      }
    }, [match, appScrollTop]);

    useEffect(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry && entry.isIntersecting && hasNextPage && !isFetching) {
            fetchNextPage();
          }
        },
        { threshold: 0.1 },
      );

      const currentTarget = observerTarget.current;
      if (currentTarget) {
        observer.observe(currentTarget);
      }

      return () => {
        if (currentTarget) {
          observer.unobserve(currentTarget);
        }
      };
    }, [hasNextPage, isFetching, fetchNextPage]);

    const hasError = status === "error" && !isFetching;
    const isLoading = status === "pending" || isFetching;

    if (
      images.length === 0 &&
      (hasError || isLoading || status === "success")
    ) {
      return (
        <>
          <motion.div
            ref={ref}
            {...props}
            className="flex h-full flex-col items-center justify-center py-24 text-center"
          >
            <div className="mb-4 flex h-18 w-18 items-center justify-center rounded-full bg-background/50 p-2 text-foreground">
              <ImageIcon className="h-12 w-12" />
            </div>
            <p className="text-lg font-medium text-foreground">
              {hasError && `Something's wrong`}
              {isLoading && "Loading"}
              {status === "success" && "No images yet"}
            </p>
            <p className="text-sm text-muted-foreground">
              {hasError && `${error?.message ?? "unknown error"}`}
              {isLoading && "Getting your images..."}
              {status === "success" && "Generated images will appear here"}
            </p>
          </motion.div>
          <Footer />
        </>
      );
    }

    return (
      <>
        <motion.div ref={ref} {...props} className="grow p-2">
          <div className="flex items-center justify-between px-2 md:hidden">
            <div className="flex items-center gap-2">
              <Logo />
            </div>

            <nav className="flex items-center gap-2 rounded-lg p-1">
              {!isSelectionMode && (
                <Button
                  variant="outline"
                  onClick={() => setIsSelectionMode(true)}
                >
                  <Trash2Icon />
                </Button>
              )}
            </nav>
          </div>
          <div
            className={`${isSelectionMode ? "sticky top-4 right-0 md:top-16" : "relative top-1"} z-2 mx-auto mb-4 flex max-w-screen-2xl justify-end gap-2 px-4`}
          >
            {isSelectionMode && (
              <ButtonGroup className="overflow-clip rounded-md bg-background">
                <Button
                  variant="secondary"
                  onClick={handleBatchDelete}
                  disabled={selectedImages.size === 0}
                  className="bg-pink-600 opacity-100"
                >
                  <Trash2Icon /> Delete ({selectedImages.size})
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsSelectionMode(false);
                    setSelectedImages(new Set());
                  }}
                  className="bg-background"
                >
                  <XIcon /> Cancel
                </Button>
              </ButtonGroup>
            )}
            {!isSelectionMode && (
              <Button
                variant="outline"
                onClick={() => setIsSelectionMode(true)}
                className="hidden md:block"
              >
                <Trash2Icon />
              </Button>
            )}
          </div>
          <ResponsiveMasonry
            columnsCountBreakPoints={{ 350: 2, 512: 3, 720: 4, 900: 5 }}
            gutterBreakPoints={{ 350: "6px", 720: "12px" }}
            className="mx-auto max-w-screen-2xl"
          >
            <Masonry>
              {data?.pages.flatMap((group) =>
                group.map((image, i) => (
                  <GalleryItem
                    key={i}
                    className="w-full"
                    image={image}
                    isSelectionMode={isSelectionMode}
                    selected={selectedImages.has(image.url)}
                    onClick={() => {
                      if (isSelectionMode) {
                        toggleSelection(image.url);
                      } else {
                        const app = document.querySelector("#app");
                        setAppScrollTop(app?.scrollTop ?? 0);
                        navigate(`~/gallery/${image.name}`, {
                          state: { from: "~/gallery" },
                        });
                      }
                    }}
                  />
                )),
              )}
            </Masonry>
          </ResponsiveMasonry>
          <div ref={observerTarget} className="col-span-full h-10 w-full" />
          {isFetchingNextPage && (
            <div className="col-span-full flex justify-center p-4">
              <span className="text-foreground">Loading more...</span>
            </div>
          )}
          <Footer className="col-span-full flex justify-center p-4" />
        </motion.div>
        <AnimatePresence>{params?.id && <ImageLightbox />}</AnimatePresence>
        <Modal
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
        >
          <RemoveDialog
            images={images.filter((img) => selectedImages.has(img.url))}
            onRemove={confirmDelete}
            onCancel={() => setShowDeleteDialog(false)}
          />
        </Modal>
      </>
    );
  },
);
