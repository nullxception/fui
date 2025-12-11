import { z } from "zod";

export const ImageSchema = z.object({
  name: z.string(),
  url: z.string(),
  mtime: z.number(),
  width: z.number(),
  height: z.number(),
  metadata: z.string(),
});

export type Image = z.infer<typeof ImageSchema>;

export interface ExifImage {
  ImageWidth?: number;
  ImageHeight?: number;
  parameters?: string;
}
