import icon from "@/icon.svg";
import manifest from "@/webmanifest.json";
import path from "path";
import sharp from "sharp";

async function maskablePWAIcon(
  img: sharp.Sharp,
  size: number,
  background: sharp.Colour,
) {
  const pad = Math.round(size * 0.25);
  const pads = { top: pad, bottom: pad, left: pad, right: pad };
  const padded = await img
    .resize(size, size, { fit: "inside" })
    .extend({ background, ...pads })
    .toBuffer();
  return sharp(padded)
    .resize(size)
    .flatten({ background })
    .png({ quality: 80 });
}

export async function buildPWAIcons(outDir: string) {
  const svg = await Bun.file(icon).text();
  const vec = sharp(Buffer.from(svg));
  return await Promise.all(
    manifest.icons.map(async (icon) => {
      const dimen = icon.sizes.split("x").map((it) => Number(it))[0] ?? 64;
      const dest = path.join(outDir, icon.src);
      let img = vec.clone();
      if (icon.purpose === "maskable") {
        img = await maskablePWAIcon(img, dimen, manifest.background_color);
      } else {
        img = img.resize(dimen).png({ quality: 80 });
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
