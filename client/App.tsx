import { QueryClientProvider } from "@tanstack/react-query";
import {
  createTRPCClient,
  httpBatchLink,
  httpLink,
  isNonJsonSerializable,
  splitLink,
} from "@trpc/client";
import {
  AnimatePresence,
  MotionConfig,
  useMotionValueEvent,
  useScroll,
} from "motion/react";
import { StrictMode, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type { AppRouter } from "server/rpc";
import { useRoute } from "wouter";
import { BackgroundLayer } from "./components/BackgroundLayer";
import { Header } from "./components/Header";
import { MobileNav } from "./components/MobileNav";
import { ThemeProvider } from "./components/theme-provider";
import { Converter } from "./converter/Converter";
import { TextToImage } from "./dashboard";
import { Gallery } from "./gallery";
import ImageLightbox from "./gallery/ImageLightbox";
import "./index.css";
import { queryClient, TRPCProvider } from "./query";
import Settings from "./settings/Settings";

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

function AppLayout() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: ref });
  const [coversContent, setCoversContent] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    if (latest > 10 && !coversContent) {
      setCoversContent(true);
    } else if (latest <= 10 && coversContent) {
      setCoversContent(false);
    }
  });

  return (
    <MotionConfig transition={{ duration: 0.3 }}>
      <BackgroundLayer />
      <div
        ref={ref}
        className="scrollbar-thin flex h-screen w-full flex-1 flex-col overflow-y-scroll pb-18 font-sans text-foreground scrollbar-thumb-accent scrollbar-track-transparent selection:bg-primary selection:text-primary-foreground md:pb-0"
      >
        <Header withBackground={coversContent} />
        <Routes />
        <MobileNav />
      </div>
      <div id="modal-root"></div>
    </MotionConfig>
  );
}

function App() {
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        splitLink({
          condition: (op) => isNonJsonSerializable(op.input),
          true: httpLink({ url: "/rpc" }),
          false: httpBatchLink({ url: "/rpc" }),
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
          <AppLayout />
        </ThemeProvider>
      </TRPCProvider>
    </QueryClientProvider>
  );
}

const elem = document.getElementById("root")!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

if (import.meta.hot) {
  const root = (import.meta.hot.data.root ??= createRoot(elem));
  root.render(app);
} else {
  // The hot module reloading API is not available in production.
  createRoot(elem).render(app);
}
