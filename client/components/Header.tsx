import { Button } from "client/components/ui/button";
import { SettingsIcon } from "lucide-react";
import { useLocation } from "wouter";

export function Header() {
  const [location, navigate] = useLocation();

  return (
    <header className="sticky top-0 z-1 hidden w-full justify-center border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 md:flex">
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <h1
            className="bg-linear-to-r from-blue-400 to-purple-500 bg-clip-text text-xl font-bold text-transparent"
            onClick={() => navigate("/")}
          >
            fui²
          </h1>
        </div>

        <nav className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-secondary/50 p-1">
            <Button
              variant={location === "/" ? "default" : "ghost"}
              size="sm"
              onClick={() => navigate("/")}
            >
              Diffusion
            </Button>
            <Button
              variant={location.startsWith("/gallery") ? "default" : "ghost"}
              size="sm"
              onClick={() => navigate("/gallery")}
            >
              Gallery
            </Button>
            <Button
              variant={location.startsWith("/converter") ? "default" : "ghost"}
              size="sm"
              onClick={() => navigate("/converter")}
            >
              Converter
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/settings")}
            title="Settings"
          >
            <SettingsIcon />
          </Button>
        </nav>
      </div>
    </header>
  );
}
