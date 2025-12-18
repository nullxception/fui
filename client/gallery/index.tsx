import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Header";
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
import { ImageIcon, ImagesIcon, Trash2Icon, XIcon } from "lucide-react";
import { motion, type HTMLMotionProps } from "motion/react";
import { forwardRef, useEffect, useRef, useState } from "react";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import { useLocation } from "wouter";
import { useImageQuery } from "./useImageQuery";

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
    const observerTarget = useRef(null);
    const [, navigate] = useLocation();
    const [selectedImages, setSelectedImages] = useState<Array<string>>([]);
    const [trashQueue, setTrashQueue] = useState<Array<string>>([]);

    const toggleSelection = (name: string) => {
      setSelectedImages(
        selectedImages.includes(name)
          ? selectedImages.filter((it) => it !== name)
          : [...selectedImages, name],
      );
    };

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
          <div className="flex items-center justify-between p-2 md:hidden">
            <Logo />
          </div>
          <ResponsiveMasonry
            columnsCountBreakPoints={{ 350: 2, 512: 3, 720: 4, 900: 5 }}
            gutterBreakPoints={{ 350: "6px", 720: "12px" }}
            className="mx-auto max-w-screen-2xl"
          >
            <Masonry>
              {data?.pages.flatMap((group) =>
                group.map((img, i) => (
                  <ContextMenu key={img.name}>
                    <ContextMenuTrigger
                      disabled={selectedImages.length > 0}
                      className={`inset-0 w-full rounded-xl`}
                    >
                      <Thumbnail
                        key={i}
                        image={img}
                        className="rounded-xl"
                        isSelectionMode={selectedImages.length > 0}
                        selected={selectedImages.includes(img.url)}
                        onClick={() => {
                          if (selectedImages.length > 0) {
                            toggleSelection(img.url);
                          } else {
                            navigate(`~/gallery/${img.name}`);
                          }
                        }}
                      />
                    </ContextMenuTrigger>
                    <ContextMenuContent className="bg-background/80 backdrop-blur-xs">
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
                )),
              )}
            </Masonry>
          </ResponsiveMasonry>
          <div ref={observerTarget} className="col-span-full h-5 w-full" />
          {isFetchingNextPage && (
            <div className="col-span-full flex justify-center p-4">
              <span className="text-foreground">Loading more...</span>
            </div>
          )}
          <Footer className="col-span-full flex justify-center p-4" />
        </motion.div>
        {selectedImages.length > 0 && (
          <motion.div className="absolute bottom-25 left-1/2 -translate-x-1/2">
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
      </>
    );
  },
);
