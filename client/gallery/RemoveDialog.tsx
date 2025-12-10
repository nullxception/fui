import { Button } from "client/components/ui/button";
import { Card } from "client/components/ui/card";
import { ArrowLeftIcon, CircleAlertIcon, Trash2Icon } from "lucide-react";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";

import type { Image } from "server/types";

interface RemoveDialogProps {
  onCancel: () => void;
  onRemove: () => void;
  count?: number;
  images?: Image[];
}

export function RemoveDialog({
  onCancel,
  onRemove,
  images = [],
}: RemoveDialogProps) {
  return (
    <Card className="m-4 flex max-w-[90vh] flex-col justify-center overflow-clip shadow-background drop-shadow-lg">
      <CircleAlertIcon className="mt-5 h-10 w-10 self-center text-pink-500" />
      <p className="p-4 text-center">
        Are you sure you want to remove{" "}
        {images.length > 1 ? `${images.length} images` : "it"}?
      </p>
      {images.length < 3 ? (
        <div className="flex items-center justify-center gap-4">
          {images.map((img) => (
            <img
              key={img.name}
              src={`${img.url}?width=128`}
              alt={img.name}
              className="w-fit rounded-md object-contain"
            />
          ))}
        </div>
      ) : (
        <ResponsiveMasonry
          columnsCountBreakPoints={{ 350: 3 }}
          gutterBreakPoints={{ 350: "6px" }}
          className="max-h-[80vh] overflow-y-auto p-4 text-center"
        >
          <Masonry>
            {images.map((img) => (
              <img
                key={img.name}
                src={`${img.url}?width=128`}
                alt={img.name}
                className="w-fit rounded-md object-contain"
              />
            ))}
          </Masonry>
        </ResponsiveMasonry>
      )}
      <div className="mt-2 flex w-full justify-center gap-2 bg-background/40 p-4">
        <Button variant="outline" className="w-1/2" onClick={onCancel}>
          <ArrowLeftIcon />
          Go back
        </Button>
        <Button variant="destructive" className="w-1/2" onClick={onRemove}>
          <Trash2Icon />
          Remove
        </Button>
      </div>
    </Card>
  );
}
