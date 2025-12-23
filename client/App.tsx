import { QueryClientProvider } from "@tanstack/react-query";
import {
  createTRPCClient,
  httpBatchLink,
  httpLink,
  httpSubscriptionLink,
  isNonJsonSerializable,
  splitLink,
} from "@trpc/client";
import { AnimatePresence, MotionConfig } from "motion/react";
import { StrictMode, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type { AppRouter } from "server/rpc";
import { useRoute } from "wouter";
import { BackgroundLayer } from "./components/BackgroundLayer";
import { Header } from "./components/Header";
import { ImageLightbox } from "./components/ImageLightbox";
import { MobileNav } from "./components/MobileNav";
import { ThemeProvider } from "./components/theme-provider";
import { Converter } from "./converter/Converter";
import { TextToImage } from "./dashboard";
import { Gallery } from "./gallery";
import "./index.css";
import { queryClient, TRPCProvider } from "./lib/query";
import { Settings } from "./settings";

const AnimationSettings = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

function Routes() {
  const [isSettings] = useRoute("/settings");
  const [isConverter] = useRoute("/converter");
  const [isLightbox, lightboxParams] = useRoute("/:page(gallery|result)/:id");
  const lightboxPage = lightboxParams?.["page(gallery|result)"] ?? "gallery";
  const [isGallery] = useRoute("/gallery");
  const [isIndex] = useRoute("/");

  return (
    <>
      {isSettings && <Settings {...AnimationSettings} />}
      {isConverter && <Converter {...AnimationSettings} />}
      {(isGallery || (isLightbox && lightboxPage === "gallery")) && (
        <Gallery {...AnimationSettings} />
      )}
      {(isIndex || (isLightbox && lightboxPage === "result")) && (
        <TextToImage {...AnimationSettings} />
      )}
      <AnimatePresence mode="wait">
        {isLightbox && <ImageLightbox key="imgLightbox" />}
      </AnimatePresence>
    </>
  );
}

function MainScaffold() {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className="scrollbar-thin flex h-screen w-full flex-1 flex-col overflow-y-scroll pb-18 font-sans text-foreground scrollbar-thumb-accent scrollbar-track-transparent selection:bg-primary selection:text-primary-foreground md:pb-0"
    >
      <Header parentRef={ref} />
      <Routes />
    </div>
  );
}

function App() {
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        splitLink({
          condition: (op) => op.type === "subscription",
          true: httpSubscriptionLink({ url: "/rpc" }),
          false: splitLink({
            // Batch all info.* and *.byFoo requests
            condition: (op) =>
              /(^info\.|\.by[A-Z])/.test(op.path) ||
              !isNonJsonSerializable(op.input),
            true: httpBatchLink({ url: "/rpc" }),
            false: httpLink({ url: "/rpc" }),
          }),
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        <BackgroundLayer />
        <MainScaffold />
        <MobileNav />
        <div id="modal-root" />
      </TRPCProvider>
    </QueryClientProvider>
  );
}

const elem = document.getElementById("root")!;
const app = (
  <StrictMode>
    <MotionConfig transition={{ duration: 0.3 }}>
      <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
        <App />
      </ThemeProvider>
    </MotionConfig>
  </StrictMode>
);

if (import.meta.hot) {
  const root = (import.meta.hot.data.root ??= createRoot(elem));
  root.render(app);
} else {
  // The hot module reloading API is not available in production.
  createRoot(elem).render(app);
}
