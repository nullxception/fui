import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  outputTab: "image" | "console";
  showLogsTime: boolean;
  hideGGUF: boolean;

  // Actions
  setOutputTab: (tab: "image" | "console") => void;
  setHideGGUF: (hide: boolean) => void;
  setShowLogsTime: (show: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      outputTab: "image",
      showLogsTime: false,
      hideGGUF: false,

      setOutputTab: (tab) => set({ outputTab: tab }),
      setHideGGUF: (hide) => set({ hideGGUF: hide }),
      setShowLogsTime: (show) => set({ showLogsTime: show }),
    }),
    {
      name: "app-storage",
      partialize: (state) => ({
        outputTab: state.outputTab,
        showLogsTime: state.showLogsTime,
        hideGGUF: state.hideGGUF,
      }),
    },
  ),
);
