import type { SDImage } from "server/types";

export async function saveImage(image: SDImage) {
  try {
    const response = await fetch(image.url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const url = response.url;
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = url.substring(url.lastIndexOf("/") + 1);
    link.click();

    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Error downloading the image:", error);
  }
}
