import { AnimatePresence, motion } from "motion/react";
import { useLocation } from "wouter";
import { navItems } from "./Header";

export function MobileNav() {
  const [location, navigate] = useLocation();

  return (
    <footer className="fixed -bottom-1 z-1 flex h-18 w-full max-w-screen-2xl items-center justify-center rounded-t-2xl border border-b-0 border-border bg-background/95 px-4 backdrop-blur select-none supports-backdrop-filter:bg-background/60 md:hidden">
      {navItems.map((item) => (
        <AnimatePresence key={item.name} mode="wait">
          <div
            onClick={() => navigate(item.target)}
            className={`relative z-10 flex h-11 cursor-pointer flex-row items-center justify-center gap-2 px-4 py-0.5 text-sm font-medium text-white transition-colors duration-300 hover:text-gray-200`}
          >
            {location === item.target && (
              <motion.div
                layoutId="mActivePill"
                className="absolute inset-0 -z-1 rounded-4xl border border-primary/60 bg-primary/30"
              />
            )}
            <item.icon
              className={`transition-all ${location === item.target && "p-0.5"}`}
              opacity={location === item.target ? 1 : 0.5}
            />

            {location === item.target && (
              <motion.span layoutId="mActiveName">{item.name}</motion.span>
            )}
          </div>
        </AnimatePresence>
      ))}
    </footer>
  );
}
