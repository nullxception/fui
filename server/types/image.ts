export interface Image {
  name: string;
  url: string;
  mtime: number;
  metadata: Record<string, unknown>;
}
