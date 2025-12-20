import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Card } from "@/components/ui/card";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { useTRPC } from "@/lib/query";
import { useMutation } from "@tanstack/react-query";
import { CloudUploadIcon } from "lucide-react";
import React, { useState } from "react";
import { useSettings } from "./useSettings";

function BackgroundSetting() {
  const { value, update } = useSettings("background");
  const [imageUrl, setImageUrl] = useState("");
  const rpc = useTRPC();
  const mutation = useMutation(
    rpc.conf.updateBackground.mutationOptions({
      onError(error) {
        alert("Failed to update background: " + error);
      },
      async onSettled(data) {
        update(data?.url);
      },
    }),
  );

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 30 * 1024 * 1024) {
      alert("Image size must be less than 30MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    const data = new FormData();
    data.append("image", file);
    mutation.mutate(data);
  };

  const handleUrlSubmit = () => {
    if (imageUrl.trim()) {
      update(imageUrl?.trim());
      setImageUrl("");
    }
  };

  const deleteBackground = async () => {
    mutation.mutate(new FormData());
  };

  return (
    <Card className="row-span-3 flex w-full flex-col gap-0 space-y-4 bg-background/60 p-4 backdrop-blur-xs">
      <h2 className="text-xs font-semibold uppercase">Background</h2>

      {/* Upload Section */}
      <div>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
          id="bg-upload"
          disabled={mutation.isPending}
        />
        <label
          htmlFor="bg-upload"
          className={`flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
            mutation.isPending
              ? "cursor-not-allowed border-border text-muted-foreground"
              : "hover:bg-surface-hover border-border text-muted-foreground hover:border-primary hover:text-foreground"
          }`}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <CloudUploadIcon className="mb-3 h-8 w-8" />
            <p className="text-sm">
              {mutation.isPending ? "Uploading..." : "Click to upload image"}
            </p>
          </div>
        </label>
      </div>

      {/* URL Input */}
      <div className="space-y-2">
        <Label htmlFor="urlBackgroundInput">Or enter image URL</Label>
        <ButtonGroup className="w-full">
          <InputGroup>
            <InputGroupInput
              id="urlBackgroundInput"
              type="url"
              placeholder="https://example.com/image.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </InputGroup>
          <Button onClick={handleUrlSubmit}>Set</Button>
        </ButtonGroup>
      </div>

      {/* Preview */}
      {value && value.length > 0 && (
        <div className="group relative">
          <img
            src={value}
            alt="Background preview"
            className="h-48 w-full rounded-md border border-border object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center rounded-md bg-background/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Button onClick={deleteBackground} variant="destructive" size="sm">
              Remove Background
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
export default BackgroundSetting;
