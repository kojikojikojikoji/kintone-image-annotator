import { distance } from "./geometry";
import type { Point, StrokeLevel } from "./shapes";

export const MAX_PEN_POINTS = 10000;

const STROKE_RATIO: Record<StrokeLevel, number> = {
  thin: 0.0025, // 0.25%
  medium: 0.005, // 0.5%
  thick: 0.01, // 1.0%
};

const FONT_RATIO: Record<StrokeLevel, number> = {
  thin: 0.02, // 2%
  medium: 0.03, // 3%
  thick: 0.05, // 5%
};

/**
 * Stroke width in canvas px for a level, sized as a ratio of the canvas long
 * side so lines look the same thickness regardless of image resolution.
 * Rounded, minimum 2px (FR-6, TC-4).
 */
export function strokeWidthFor(longSide: number, level: StrokeLevel): number {
  return Math.max(2, Math.round(longSide * STROKE_RATIO[level]));
}

/**
 * Font size in canvas px for a level, tied to the stroke level and canvas long
 * side. Rounded, minimum 14px (FR-7, TC-5).
 */
export function fontSizeFor(longSide: number, level: StrokeLevel): number {
  return Math.max(14, Math.round(longSide * FONT_RATIO[level]));
}

/**
 * Decide whether a candidate point is far enough from the last accepted point
 * to keep. Points closer than half the stroke width are dropped (FR-5, TC-9).
 */
export function shouldAddPoint(
  lastAccepted: Point,
  candidate: Point,
  strokeWidth: number,
): boolean {
  return distance(lastAccepted, candidate) >= strokeWidth / 2;
}

/**
 * Reduce a raw pointer path to the points that will be stored: drop points that
 * moved less than half the stroke width from the previous kept point, and cap
 * the result at maxPoints (FR-5, TC-9).
 */
export function thinStroke(
  points: Point[],
  strokeWidth: number,
  maxPoints: number = MAX_PEN_POINTS,
): Point[] {
  if (points.length === 0) return [];
  const kept: Point[] = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    if (kept.length >= maxPoints) break;
    const candidate = points[i];
    if (shouldAddPoint(kept[kept.length - 1], candidate, strokeWidth)) {
      kept.push(candidate);
    }
  }
  return kept;
}
