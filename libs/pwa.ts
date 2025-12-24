import icon from "@/icon.svg";
import manifest from "@/webmanifest.json";
import path from "path";
import sharp from "sharp";

export async function buildPWAIcons(outDir: string) {
  const svg = await Bun.file(icon).text();
  const vec = sharp(Buffer.from(svg));
  return await Promise.all(
    manifest.icons.map(async (icon) => {
      const dimen = icon.sizes.split("x").map((it) => Number(it))[0] ?? 64;
      const dest = path.join(outDir, icon.src);
      let img = vec.clone().png({ quality: 80 }).resize(dimen);
      if (icon.purpose === "maskable") {
        img = img.flatten({ background: manifest.background_color });
      }
      await img.toFile(dest);
      return { path: dest, kind: "asset" };
    }),
  );
}

export async function copyManifest(outDir: string) {
  const dest = path.join(outDir, "app.webmanifest");
  await Bun.file(dest).write(JSON.stringify(manifest));
  return { path: dest, kind: "asset" };
}
