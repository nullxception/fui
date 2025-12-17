import type { Timeout } from "@/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDiffusionConfig } from "./useDiffusionConfig";

type PromptType = "prompt" | "negativePrompt";

interface PromptState {
  value?: string;
  changed: boolean;
}

const DEBOUNCE_DELAY = 500;

export function usePromptState(type: PromptType) {
  const store = useDiffusionConfig();
  const storeValue =
    type === "prompt" ? store.params.prompt : store.params.negativePrompt;

  const [state, setState] = useState<PromptState>(() => ({
    value: storeValue,
    changed: false,
  }));

  const debounceTimerRef = useRef<Timeout | null>(null);

  // Only update if user isn't actively editing and values are different
  if (!state.changed && state.value !== storeValue) {
    setState({
      value: storeValue,
      changed: false,
    });
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const saveToStore = useCallback(
    async (value?: string) => {
      try {
        store.update(type, value);
        setState((prev) => ({
          ...prev,
          changed: false,
        }));
      } catch (error) {
        console.error("Failed to save prompt:", error);
      }
    },
    [store, type],
  );

  const debouncedSave = useCallback(
    (value?: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      setState((prev) => ({ ...prev, changed: true }));

      debounceTimerRef.current = setTimeout(() => {
        saveToStore(value);
        debounceTimerRef.current = null;
      }, DEBOUNCE_DELAY);
    },
    [saveToStore],
  );

  const updatePrompt = useCallback(
    (newValue?: string) => {
      setState((prev) => ({ ...prev, value: newValue }));
      debouncedSave(newValue);
    },
    [debouncedSave],
  );

  const forceSave = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    saveToStore(state.value);
  }, [saveToStore, state.value]);

  return {
    value: state.value,
    changed: state.changed,
    updatePrompt,
    forceSave,
  };
}
