import { QueryClientProvider } from "@tanstack/react-query";
import {
  createTRPCClient,
  httpBatchLink,
  httpLink,
  isNonJsonSerializable,
  splitLink,
} from "@trpc/client";
import { AnimatePresence } from "framer-motion";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import type { AppRouter } from "server/rpc";
import { useRoute } from "wouter";
import { BackgroundLayer } from "./components/BackgroundLayer";
import { Header } from "./components/Header";
import { MobileNav } from "./components/MobileNav";
import { ThemeProvider } from "./components/theme-provider";
import Converter from "./converter/Converter";
import TextToImage from "./dashboard";
import Gallery from "./gallery";
import "./index.css";
import { queryClient, TRPCProvider } from "./query";
import Settings from "./settings/Settings";

const AnimationSettings = {
  transition: { duration: 0.3 },
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

function Routes() {
  const [isSettings] = useRoute("/settings");
  const [isGallery] = useRoute("/gallery/*?");
  const [isConverter] = useRoute("/converter");
  const [isIndex] = useRoute("/");
  return (
    <AnimatePresence>
      {isGallery && <Gallery {...AnimationSettings} />}
      {isConverter && <Converter {...AnimationSettings} />}
      {isIndex && <TextToImage {...AnimationSettings} />}
      {isSettings && <Settings {...AnimationSettings} />}
    </AnimatePresence>
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
          <BackgroundLayer />
          <div className="scrollbar-thin flex h-screen w-full flex-1 flex-col overflow-y-scroll font-sans text-foreground scrollbar-thumb-accent scrollbar-track-transparent selection:bg-primary selection:text-primary-foreground">
            <Header />
            <Routes />
            <MobileNav />
          </div>
          <div id="modal-root"></div>
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
