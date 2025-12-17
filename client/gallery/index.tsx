import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Header";
import Modal from "@/components/Modal";
import { Thumbnail } from "@/components/Thumbnail";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { motion, type HTMLMotionProps } from "framer-motion";
import { ImageIcon, Trash2Icon, XIcon } from "lucide-react";
import { forwardRef, useEffect, useRef, useState } from "react";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import { useLocation } from "wouter";
import { RemoveDialog } from "./RemoveDialog";
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

    const onRemoveImages = async () => {
      await removeImages(Array.from(selectedImages));
    };

    const onImagesRemoved = async () => {
      setIsSelectionMode(false);
      setSelectedImages(new Set());
      setShowDeleteDialog(false);
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
                  <Thumbnail
                    key={i}
                    className="w-full rounded-xl"
                    image={image}
                    isSelectionMode={isSelectionMode}
                    selected={selectedImages.has(image.url)}
                    onClick={() => {
                      if (isSelectionMode) {
                        toggleSelection(image.url);
                      } else {
                        navigate(`~/gallery/${image.name}`);
                      }
                    }}
                  />
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
        <Modal
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
        >
          <RemoveDialog
            images={images.filter((img) => selectedImages.has(img.url))}
            onRemove={onRemoveImages}
            onRemoved={onImagesRemoved}
            onCancel={() => setShowDeleteDialog(false)}
          />
        </Modal>
      </>
    );
  },
);
