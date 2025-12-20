import { AtomIcon, ImageIcon, SettingsIcon, ZapIcon } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
} from "motion/react";
import { useState, type RefObject } from "react";
import { useLocation } from "wouter";
import { NavItem } from "./NavItems";

export function Logo({ className = "" }: { className?: string }) {
  const [, navigate] = useLocation();
  return (
    <motion.h1
      layoutId="fuilogo"
      className={`bg-linear-to-r from-blue-400 to-purple-500 bg-clip-text text-xl font-bold text-transparent ${className}`}
      onClick={() => navigate("/")}
    >
      fui²
    </motion.h1>
  );
}

export const navItems = [
  { name: "Diffusion", target: "/", icon: ZapIcon },
  { name: "Gallery", target: "/gallery", icon: ImageIcon },
  { name: "Converter", target: "/converter", icon: AtomIcon },
  { name: "Settings", target: "/settings", icon: SettingsIcon },
];

function HeaderContent() {
  const [location, navigate] = useLocation();
  return (
    <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-2">
      <Logo className="px-4" />

      <nav className="hidden items-center gap-2 rounded-lg border border-border bg-background/50 p-1 md:flex">
        <AnimatePresence>
          {navItems.map((item) => (
            <NavItem
              key={item.name}
              groupName="header-nav"
              entry={item}
              isActive={location === item.target}
              setActiveEntry={(item) => navigate(item.target)}
            />
          ))}
        </AnimatePresence>
      </nav>
    </div>
  );
}

export function Header({
  parentRef,
}: {
  parentRef: RefObject<HTMLDivElement | null>;
}) {
  const { scrollY } = useScroll({ container: parentRef });
  const [coversContent, setCoversContent] = useState(false);
  useMotionValueEvent(scrollY, "change", (latest) => {
    if (latest > 10 && !coversContent) {
      setCoversContent(true);
    } else if (latest <= 10 && coversContent) {
      setCoversContent(false);
    }
  });

  return (
    <header
      className={`top-0 z-3 w-full justify-center md:sticky ${coversContent && "md:border-b md:border-border md:bg-background/60 md:backdrop-blur"} flex`}
    >
      <HeaderContent />
    </header>
  );
}
