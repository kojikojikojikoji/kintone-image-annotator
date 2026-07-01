import type { Point } from "./shapes";

export interface Size {
  width: number;
  height: number;
}

/**
 * Maps between canvas coordinates (image pixels, origin top-left) and display
 * coordinates (on-screen pixels). displayX = canvasX * scale + offsetX.
 */
export interface Viewport {
  /** canvas px -> display px factor. */
  scale: number;
  /** display-space translation. */
  offsetX: number;
  offsetY: number;
}

export const ZOOM_MIN = 50;
export const ZOOM_MAX = 400;

export function canvasToDisplay(p: Point, v: Viewport): Point {
  return { x: p.x * v.scale + v.offsetX, y: p.y * v.scale + v.offsetY };
}

export function displayToCanvas(p: Point, v: Viewport): Point {
  return { x: (p.x - v.offsetX) / v.scale, y: (p.y - v.offsetY) / v.scale };
}

/** Clamp a zoom percentage to the supported 50-400% range (FR-9, TC-8). */
export function clampZoom(percent: number): number {
  if (percent < ZOOM_MIN) return ZOOM_MIN;
  if (percent > ZOOM_MAX) return ZOOM_MAX;
  return percent;
}

/**
 * Scale at which the whole image fits inside the viewport. This is the 100%
 * reference (FR-9): 100% zoom -> scale = fitScale.
 */
export function fitScale(canvas: Size, viewport: Size): number {
  if (canvas.width <= 0 || canvas.height <= 0) return 1;
  return Math.min(viewport.width / canvas.width, viewport.height / canvas.height);
}

/** Convert a zoom percentage (100 = fit) to a display scale factor. */
export function scaleForZoom(zoomPercent: number, canvas: Size, viewport: Size): number {
  return fitScale(canvas, viewport) * (clampZoom(zoomPercent) / 100);
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Clamp a pan offset so the image never leaves the viewport entirely. When the
 * scaled image is smaller than the viewport on an axis it is centered on that
 * axis (FR-9).
 */
export function clampPan(v: Viewport, canvas: Size, viewport: Size): Viewport {
  const scaledW = canvas.width * v.scale;
  const scaledH = canvas.height * v.scale;

  const clampAxis = (offset: number, scaled: number, view: number): number => {
    if (scaled <= view) {
      // Center the image on this axis.
      return (view - scaled) / 2;
    }
    // Keep the image covering the viewport: offset in [view - scaled, 0].
    const min = view - scaled;
    const max = 0;
    if (offset < min) return min;
    if (offset > max) return max;
    return offset;
  };

  return {
    scale: v.scale,
    offsetX: clampAxis(v.offsetX, scaledW, viewport.width),
    offsetY: clampAxis(v.offsetY, scaledH, viewport.height),
  };
}

/**
 * Recompute the pan offset so a given canvas point stays under the same display
 * point after a scale change. Used for cursor/pinch-anchored zoom (FR-9).
 */
export function zoomAround(anchorDisplay: Point, anchorCanvas: Point, newScale: number): Viewport {
  return {
    scale: newScale,
    offsetX: anchorDisplay.x - anchorCanvas.x * newScale,
    offsetY: anchorDisplay.y - anchorCanvas.y * newScale,
  };
}

const ARROWHEAD_HALF_ANGLE = (Math.PI / 180) * 15; // 30 degree opening angle.

/**
 * Two base points of the arrowhead triangle. The apex is the arrow end point
 * (x2, y2); each wing sits `strokeWidth * 4` back along the shaft, rotated
 * +/-15 degrees (30 degree opening angle) (FR-5, TC-10).
 */
export function arrowheadPoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  strokeWidth: number,
): [Point, Point] {
  const length = strokeWidth * 4;
  // Angle of the shaft pointing back from the tip toward the start.
  const back = Math.atan2(y1 - y2, x1 - x2);
  const left = {
    x: x2 + length * Math.cos(back + ARROWHEAD_HALF_ANGLE),
    y: y2 + length * Math.sin(back + ARROWHEAD_HALF_ANGLE),
  };
  const right = {
    x: x2 + length * Math.cos(back - ARROWHEAD_HALF_ANGLE),
    y: y2 + length * Math.sin(back - ARROWHEAD_HALF_ANGLE),
  };
  return [left, right];
}
