import { QueryClientProvider } from "@tanstack/react-query";
import {
  createTRPCClient,
  httpLink,
  httpSubscriptionLink,
  splitLink,
} from "@trpc/client";
import { AnimatePresence } from "motion/react";
import { useRef, useState } from "react";
import { Helmet } from "react-helmet";
import type { AppRouter } from "server/rpc";
import { useRoute } from "wouter";
import { BackgroundLayer } from "./components/BackgroundLayer";
import { Header } from "./components/Header";
import { ImageLightbox } from "./components/ImageLightbox";
import { MobileNav } from "./components/MobileNav";
import { Converter } from "./converter";
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

export function PWAHelmet() {
  if (import.meta.hot) return; // skip dev env

  return (
    <Helmet>
      <link rel="manifest" href="/app.webmanifest" />
      <link rel="apple-touch-icon" href="/appicon-180.png" />
    </Helmet>
  );
}

export function App() {
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        splitLink({
          condition: (op) => op.type === "subscription",
          true: httpSubscriptionLink({ url: "/rpc" }),
          false: httpLink({ url: "/rpc" }),
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
