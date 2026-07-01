import { drawShapes } from "../core/rasterizer";
import { computeResize, FALLBACK_LONG_SIDE, MAX_LONG_SIDE } from "../core/resize";
import type { Shape } from "../core/shapes";
import type { OutputFormat } from "../core/naming";

/**
 * Decode a blob into an upright bitmap. imageOrientation "from-image" applies
 * the EXIF orientation so display and saved output match (EC-16). For animated
 * GIF only the first frame is decoded (EC-15).
 */
export async function decodeUpright(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob, { imageOrientation: "from-image" });
}

export interface PreparedImage {
  bitmap: ImageBitmap;
  width: number;
  height: number;
  resized: boolean;
}

/** A 2D context, or throw so the caller can fall back or fail (EC-6). */
function contextAt(width: number, height: number): CanvasRenderingContext2D {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx || canvas.width !== width || canvas.height !== height) {
    throw new Error("canvas allocation failed");
  }
  return ctx;
}

/**
 * Prepare the edit-resolution bitmap. Downscales over 8000px (FR-10); if the
 * canvas cannot be allocated at that size, retries at 4096px (EC-6). Throws if
 * even the fallback fails, so the caller shows the "too large" message.
 */
export async function prepareImage(source: ImageBitmap): Promise<PreparedImage> {
  const attempt = async (maxLong: number): Promise<PreparedImage> => {
    const { width, height, resized } = computeResize(source.width, source.height, maxLong);
    const ctx = contextAt(width, height);
    ctx.drawImage(source, 0, 0, width, height);
    const bitmap = await createImageBitmap(ctx.canvas);
    return { bitmap, width, height, resized: resized || maxLong < MAX_LONG_SIDE };
  };
  try {
    return await attempt(MAX_LONG_SIDE);
  } catch {
    return attempt(FALLBACK_LONG_SIDE);
  }
}

/**
 * Rasterize the source image plus shapes to a Blob in the chosen format
 * (FR-11). PNG keeps transparency; JPEG uses the given quality.
 */
export function rasterizeToBlob(
  image: CanvasImageSource,
  width: number,
  height: number,
  shapes: Shape[],
  output: OutputFormat,
): Promise<Blob> {
  const ctx = contextAt(width, height);
  ctx.drawImage(image, 0, 0, width, height);
  drawShapes(ctx, shapes);
  return new Promise((resolve, reject) => {
    ctx.canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob returned null"))),
      output.mime,
      output.quality,
    );
  });
}
