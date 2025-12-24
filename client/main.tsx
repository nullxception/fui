import { MotionConfig } from "motion/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App, PWAHelmet } from "./App";
import { ThemeProvider } from "./components/theme-provider";
import "./index.css";

const elem = document.getElementById("root")!;
const app = (
  <StrictMode>
    <PWAHelmet />
    <MotionConfig transition={{ duration: 0.3 }}>
      <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
        <App />
      </ThemeProvider>
    </MotionConfig>
  </StrictMode>
);

function registerSW() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.error("SW registration failed:", err));
    });
  }
}

if (import.meta.hot) {
  const root = (import.meta.hot.data.root ??= createRoot(elem));
  root.render(app);
} else {
  registerSW();
  // The hot module reloading API is not available in production.
  createRoot(elem).render(app);
}
