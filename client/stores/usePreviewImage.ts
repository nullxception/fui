import type { SDImage } from "server/types";
import { create } from "zustand";
import { useAppStore } from "./useAppStore";

interface PreviewImageStore {
  image?: SDImage;
  setPreviewImage: (image?: SDImage) => void;
}

export const usePreviewImage = create<PreviewImageStore>((set) => ({
  setPreviewImage(image) {
    set({ image });
    useAppStore.getState().setOutputTab("image");
  },
}));
