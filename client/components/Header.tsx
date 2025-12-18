import { AtomIcon, ImageIcon, SettingsIcon, ZapIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
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

export function Header({ withBackground }: { withBackground: boolean }) {
  const [location, navigate] = useLocation();

  return (
    <header
      className={`top-0 z-3 w-full justify-center md:sticky ${withBackground && "md:border-b md:border-border md:bg-background/60 md:backdrop-blur"} flex`}
    >
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-2">
        <Logo className="px-4" />

        <nav className="hidden items-center gap-2 rounded-lg border border-border bg-background/50 p-1 md:flex">
          {navItems.map((item) => (
            <AnimatePresence key={item.name} mode="wait">
              <NavItem
                groupName="header-nav"
                entry={item}
                isActive={location === item.target}
                setActiveEntry={(item) => navigate(item.target)}
              />
            </AnimatePresence>
          ))}
        </nav>
      </div>
    </header>
  );
}
