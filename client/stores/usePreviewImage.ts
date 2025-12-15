import { create } from "zustand";
import { useAppStore } from "./useAppStore";

interface PreviewImageStore {
  urls?: string[];
  from: "txt2img" | "gallery";
  setPreviewImages: (from: "txt2img" | "gallery", urls?: string[]) => void;
}

export const usePreviewImage = create<PreviewImageStore>((set) => ({
  from: "txt2img",
  setPreviewImages(from, urls) {
    set({ from, urls });
    useAppStore.getState().setOutputTab("image");
  },
}));
