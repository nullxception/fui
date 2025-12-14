import { create } from "zustand";
import { useAppStore } from "./useAppStore";

interface PreviewImageStore {
  urls?: string[];
  setPreviewImages: (urls?: string[]) => void;
}

export const usePreviewImage = create<PreviewImageStore>((set) => ({
  setPreviewImages(urls) {
    set({ urls });
    useAppStore.getState().setOutputTab("image");
  },
}));
