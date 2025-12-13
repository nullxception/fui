import { create } from "zustand";
import { useAppStore } from "./useAppStore";

interface PreviewImageStore {
  url?: string;
  setPreviewImage: (url?: string) => void;
}

export const usePreviewImage = create<PreviewImageStore>((set) => ({
  setPreviewImage(url) {
    set({ url });
    useAppStore.getState().setOutputTab("image");
  },
}));
