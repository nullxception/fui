import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  outputTab: "image" | "console";
  showSettings: boolean;
  hideGGUF: boolean;

  // Actions
  setOutputTab: (tab: "image" | "console") => void;
  setHideGGUF: (hide: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      outputTab: "image",
      showSettings: false,
      hideGGUF: false,

      setOutputTab: (tab) => set({ outputTab: tab }),
      setHideGGUF: (hide) => set({ hideGGUF: hide }),
    }),
    {
      name: "app-storage",
      partialize: (state) => ({
        outputTab: state.outputTab,
        hideGGUF: state.hideGGUF,
      }),
    },
  ),
);
