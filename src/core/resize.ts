export const MAX_LONG_SIDE = 8000;
export const FALLBACK_LONG_SIDE = 4096;

export interface ResizeResult {
  width: number;
  height: number;
  resized: boolean;
}

/**
 * Compute the edit resolution. Images whose long side exceeds `maxLong` are
 * scaled so the long side becomes exactly `maxLong`, keeping aspect ratio and
 * rounding the short side (FR-10, TC-6).
 */
export function computeResize(
  width: number,
  height: number,
  maxLong: number = MAX_LONG_SIDE,
): ResizeResult {
  const longSide = Math.max(width, height);
  if (longSide <= maxLong) {
    return { width, height, resized: false };
  }
  if (width >= height) {
    return {
      width: maxLong,
      height: Math.round((height * maxLong) / width),
      resized: true,
    };
  }
  return {
    width: Math.round((width * maxLong) / height),
    height: maxLong,
    resized: true,
  };
}
