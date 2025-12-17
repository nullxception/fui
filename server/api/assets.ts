import path from "path";
import { OUTPUT_DIR, PUBLIC_DIR, THUMBS_DIR } from "server/dirs";
import sharp from "sharp";

const assetsCacheControl = "public, max-age=31536000, immutable";

async function serveThumbnail(filepath: string, size: number) {
  const thumb = path.join(
    THUMBS_DIR,
    `${path.parse(filepath).name}--${size}.jpg`,
  );

  try {
    const file = await Bun.file(thumb).bytes();
    return new Response(file, {
      headers: { "Cache-Control": assetsCacheControl },
    });
  } catch {
    let img = sharp(filepath);

    // only resize if it's a thumbnail request
    // otherwise just compress it to progressive jpeg
    if (size > 0) {
      img = img.resize(size, null, { fit: "inside" });
    } else {
      img = img.withMetadata();
    }
    await img.jpeg({ quality: 80, progressive: true }).toFile(thumb);
    return new Response(Bun.file(thumb), {
      headers: { "Cache-Control": assetsCacheControl },
    });
  }
}

async function serveStatic(req: Request) {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Serve static files from public directory (user-uploaded images)
  if (pathname.startsWith("/upload/")) {
    const filepath = path.join(PUBLIC_DIR, pathname);
    return new Response(Bun.file(filepath), {
      headers: { "Cache-Control": assetsCacheControl },
    });
  }

  // Serve output images
  if (pathname.startsWith("/output/")) {
    const filepath = path.join(OUTPUT_DIR, pathname.replace("/output", ""));
    const width = Number(url.searchParams.get("width")) || 0;
    if (width > 0) {
      // looks like we're getting thumbnail request
      return await serveThumbnail(filepath, width);
    }
    if (url.searchParams.has("preview")) {
      return await serveThumbnail(filepath, 0);
    }

    return new Response(Bun.file(filepath), {
      headers: { "Cache-Control": assetsCacheControl },
    });
  }

  return new Response("Not found", { status: 404 });
}

export default serveStatic;
