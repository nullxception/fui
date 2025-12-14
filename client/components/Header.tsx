import { Button } from "client/components/ui/button";
import { AtomIcon, ImageIcon, SettingsIcon, ZapIcon } from "lucide-react";
import { useLocation } from "wouter";

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

export function Header({ containerTop }: { containerTop: number }) {
  const [location, navigate] = useLocation();

  return (
    <header
      className={`sticky top-0 z-3 hidden w-full justify-center ${containerTop > 10 && "border-b border-border bg-background/60"} backdrop-blur md:flex`}
    >
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-2">
        <Logo className="px-4" />

        <nav className="flex items-center gap-2 rounded-lg border border-border bg-background/50 p-1">
          <Button
            variant={location === "/" ? "default" : "ghost"}
            className={location === "/" ? "bg-primary/30!" : ""}
            size="sm"
            onClick={() => navigate("/")}
          >
            <ZapIcon />
            Diffusion
          </Button>
          <Button
            variant={location.startsWith("/gallery") ? "default" : "ghost"}
            className={location.startsWith("/gallery") ? "bg-primary/30!" : ""}
            size="sm"
            onClick={() => navigate("/gallery")}
          >
            <ImageIcon />
            Gallery
          </Button>
          <Button
            variant={location.startsWith("/converter") ? "default" : "ghost"}
            className={
              location.startsWith("/converter") ? "bg-primary/30!" : ""
            }
            size="sm"
            onClick={() => navigate("/converter")}
          >
            <AtomIcon />
            Converter
          </Button>
          <Button
            variant={location.startsWith("/settings") ? "default" : "ghost"}
            className={location.startsWith("/settings") ? "bg-primary/30!" : ""}
            size="sm"
            onClick={() => navigate("/settings")}
          >
            <SettingsIcon />
            Settings
          </Button>
        </nav>
      </div>
    </header>
  );
}
