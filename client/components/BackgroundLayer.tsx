import { useSettings } from "client/settings/useSettings";

export function BackgroundLayer() {
  const { settings } = useSettings();
  const bg = settings.background;
  const hasBg = bg && bg.length > 0;
  return (
    <div
      className="fixed top-1/2 left-1/2 -z-2 h-screen w-full -translate-1/2 bg-cover bg-center bg-no-repeat"
      style={hasBg ? { backgroundImage: `url(${bg})` } : {}}
    >
      <div
        className="fixed top-0 left-0 -z-1 h-screen w-full bg-radial from-black/65 from-35% to-background"
        hidden={!hasBg}
      />
    </div>
  );
}
