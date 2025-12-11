import type { Image } from "server/types";
import { create } from "zustand";
import { useAppStore } from "./useAppStore";

interface PreviewImageStore {
  image?: Image;
  setPreviewImage: (image?: Image) => void;
}

export const usePreviewImage = create<PreviewImageStore>((set) => ({
  setPreviewImage(image) {
    set({ image });
    useAppStore.getState().setOutputTab("image");
  },
}));
