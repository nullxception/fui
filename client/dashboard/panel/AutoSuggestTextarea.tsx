import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/lib/query";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, type HTMLMotionProps } from "motion/react";
import { Portal } from "radix-ui";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { SuggestionTag } from "server/types/tags";
import getCaretCoordinates from "textarea-caret";

type AutoSuggestTextareaProps = React.ComponentProps<"textarea"> & {
  onValueChange?: (value: string) => void;
  containerClassName?: string;
};

function TagSuggestionMenu({
  tags,
  onSelected: onSelected,
  ...props
}: HTMLMotionProps<"div"> & {
  tags: SuggestionTag[];
  onSelected: (tag: SuggestionTag) => void;
}) {
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((prev) => (prev + 1) % tags.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((prev) => (prev - 1 + tags.length) % tags.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (tags[selected]) onSelected(tags[selected]);
      }
    };
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [onSelected, selected, tags]);

  return (
    <motion.div
      {...props}
      layout
      layoutId="autoSuggestion"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ duration: 0.1 }}
      className="absolute z-10 scrollbar-thin flex min-w-30 flex-col gap-0.5 overflow-y-auto rounded-md border border-border bg-background/80 p-1 shadow-lg backdrop-blur-xs scrollbar-thumb-accent scrollbar-track-transparent"
    >
      {tags.map((s, i) => (
        <motion.div
          key={s.name}
          layout
          transition={{ duration: 0.06 }}
          onClick={() => {
            setSelected(0);
            onSelected(s);
          }}
          className={cn(
            "flex cursor-pointer flex-row items-center gap-1 rounded-sm px-2 py-0.5 font-mono text-xs transition-colors",
            i === selected
              ? "bg-primary/50 text-primary-foreground"
              : "hover:bg-primary/50",
          )}
        >
          <div className="grow">{s.name}</div>
          <div
            className={cn(
              "rounded-sm bg-primary/25 px-1 py-0.5 text-[10px] text-nowrap",
              i === selected && "bg-black",
            )}
          >
            {s.postCount}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

function autoResize(el: HTMLTextAreaElement, pos?: number) {
  requestAnimationFrame(() => {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
    if (pos) {
      el.selectionStart = pos;
      el.selectionEnd = pos;
    }
  });
}

function calcMenuOffset(
  textArea: HTMLTextAreaElement | null,
  tagsMenu: HTMLElement | null,
) {
  if (!textArea) return;
  const cursor = textArea.selectionStart;
  const caret = getCaretCoordinates(textArea, cursor);
  const inputRect = textArea.getBoundingClientRect();
  const bodyRect = document.body.getBoundingClientRect();
  const caretTop = inputRect.top - window.scrollY + caret.top + 16;
  const caretLeft = inputRect.left - window.scrollX + caret.left;
  const tagsWidth = tagsMenu?.offsetWidth ?? 300;
  const safeLeft = Math.min(caretLeft, bodyRect.width - tagsWidth) - 1;
  const safeHeight = Math.min(bodyRect.height - caretTop, 768) - 1;
  return {
    top: caretTop,
    left: safeLeft,
    maxWidth: Math.min(tagsWidth, 300),
    maxHeight: safeHeight,
  };
}

function getLastStop(str: string) {
  const chars = [">", "\n", ".", ","];
  return Math.max(...chars.map((it) => str.lastIndexOf(it)));
}

export function AutoSuggestTextarea({
  value,
  onChange,
  onValueChange,
  className,
  onKeyDown,
  onBlur,
  ...props
}: AutoSuggestTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const rpc = useTRPC();
  const [currentWord, setCurrentWord] = useState("");
  const { data } = useQuery(
    rpc.tags.suggest.queryOptions(
      { limit: 100, query: currentWord },
      {
        placeholderData: (prev) => prev,
        staleTime: 60,
      },
    ),
  );
  const tags = data ?? [];
  const [menuOffset, setMenuOffset] = useState({
    top: -1,
    left: 0,
    maxWidth: 300,
    maxHeight: 120,
  });
  const tagsRef = useRef<HTMLDivElement>(null);
  const suggestionOpen = tags.length > 0 && menuOffset.top > 1;

  function showSuggestion(word: string) {
    setCurrentWord(word);
    const offset = calcMenuOffset(ref.current, tagsRef.current);
    if (offset) setMenuOffset(offset);
  }

  function hideSuggestion() {
    setMenuOffset((x) => ({ ...x, top: -1 }));
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    onChange?.(e);
    onValueChange?.(value);
    const pos = e.target.selectionStart;
    const before = value.substring(0, pos);
    const words = before.split(/[>,.\n]/);
    const last = words[words.length - 1];
    const current = last ?? "";
    showSuggestion(current);
  }

  function selectSuggestion(suggestion: string) {
    const text = (value as string | undefined) ?? "";
    const pos = ref.current?.selectionStart || 0;
    const beforeCaret = text.substring(0, pos);
    const afterCaret = text.substring(pos);
    const stop = getLastStop(beforeCaret);
    const separator = /^,.*/.test(afterCaret) ? "" : ",";
    const gap = currentWord.startsWith(" ") ? " " : "";
    const newText = `${gap}${suggestion}`
      .replaceAll("_", " ")
      .replaceAll("(", "\\(")
      .replaceAll(")", "\\)")
      .concat(separator);
    const newPos = pos + (newText.length - currentWord.length);
    const before = beforeCaret.substring(0, stop + 1);
    onValueChange?.(before + newText + afterCaret);
    setCurrentWord("");
    if (!ref.current) return;

    ref.current.focus();
    autoResize(ref.current, newPos);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.ctrlKey && (e.key === " " || e.code === "Space")) {
      e.preventDefault();
      showSuggestion(" ");
    }

    if (!suggestionOpen) return;
    if (e.key === "Backspace" || e.key === "Escape") {
      hideSuggestion();
    }
    onKeyDown?.(e);
  }

  useLayoutEffect(() => {
    if (!ref.current) return;
    autoResize(ref.current);
  }, [value]);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry === undefined || !ref.current) return;
      autoResize(ref.current);
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Textarea
        {...props}
        ref={ref}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onBlur={(e) => {
          onBlur?.(e);
          autoResize(e.target);
          // Hide suggestions on blur (after a delay to allow clicks)
          setTimeout(hideSuggestion, 200);
        }}
        onMouseDown={hideSuggestion}
        className={className}
      />
      <Portal.Root className="overflow-hidden">
        <AnimatePresence>
          {suggestionOpen && (
            <TagSuggestionMenu
              ref={tagsRef}
              tags={tags}
              onSelected={(s) => selectSuggestion(s.name)}
              style={{
                top: menuOffset.top,
                left: menuOffset.left,
                maxWidth: menuOffset.maxWidth,
                maxHeight: menuOffset.maxHeight,
              }}
            />
          )}
        </AnimatePresence>
      </Portal.Root>
    </>
  );
}
