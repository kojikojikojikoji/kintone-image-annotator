import { describe, expect, it } from "vitest";
import { fontSizeFor, strokeWidthFor, thinStroke } from "../../src/core/stroke";
import type { Point } from "../../src/core/shapes";

describe("stroke sizing", () => {
  it("TC-4: stroke width by level and long side", () => {
    expect(strokeWidthFor(4000, "thin")).toBe(10);
    expect(strokeWidthFor(4000, "medium")).toBe(20);
    expect(strokeWidthFor(4000, "thick")).toBe(40);
    // 400px long side: 0.25%/0.5% clamp to the 2px minimum, 1% -> 4.
    expect(strokeWidthFor(400, "thin")).toBe(2);
    expect(strokeWidthFor(400, "medium")).toBe(2);
    expect(strokeWidthFor(400, "thick")).toBe(4);
  });

  it("TC-5: font size by level, rounded, min 14", () => {
    expect(fontSizeFor(4032, "thin")).toBe(81);
    expect(fontSizeFor(4032, "medium")).toBe(121);
    expect(fontSizeFor(4032, "thick")).toBe(202);
    expect(fontSizeFor(200, "thin")).toBe(14); // 4 -> clamp to 14
  });
});

describe("pen thinning", () => {
  it("TC-9: drops points closer than half the stroke width", () => {
    const points: Point[] = [];
    for (let x = 0; x <= 50; x += 5) points.push({ x, y: 0 });
    // strokeWidth 20 -> threshold 10px. Keep every 10px: 0,10,20,30,40,50.
    const kept = thinStroke(points, 20);
    expect(kept.map((p) => p.x)).toEqual([0, 10, 20, 30, 40, 50]);
  });

  it("TC-9: caps at 10,000 points", () => {
    const points: Point[] = [];
    for (let i = 0; i < 10050; i += 1) points.push({ x: i * 100, y: 0 });
    const kept = thinStroke(points, 20);
    expect(kept.length).toBe(10000);
  });
});
