import { AnimatePresence } from "framer-motion";
import { AtomIcon, ImageIcon, SettingsIcon, ZapIcon } from "lucide-react";
import { useLocation } from "wouter";
import { NavItem } from "./NavItems";

export function Logo({ className = "" }: { className?: string }) {
  const [, navigate] = useLocation();
  return (
    <h1
      className={`bg-linear-to-r from-blue-400 to-purple-500 bg-clip-text text-xl font-bold text-transparent ${className}`}
      onClick={() => navigate("/")}
    >
      fui²
    </h1>
  );
}

const navItems = [
  { name: "Home", target: "/", icon: ZapIcon },
  { name: "Gallery", target: "/gallery", icon: ImageIcon },
  { name: "Converter", target: "/converter", icon: AtomIcon },
  { name: "Settings", target: "/settings", icon: SettingsIcon },
];

export function Header({ containerTop }: { containerTop: number }) {
  const [location, navigate] = useLocation();

  return (
    <header
      className={`sticky top-0 z-3 hidden w-full justify-center ${containerTop > 10 && "border-b border-border bg-background/60 backdrop-blur"} md:flex`}
    >
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-2">
        <Logo className="px-4" />

        <nav className="flex items-center gap-2 rounded-lg border border-border bg-background/50 p-1">
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
