import { describe, expect, it } from "vitest";
import {
  arrowheadPoints,
  canvasToDisplay,
  clampZoom,
  displayToCanvas,
  type Viewport,
} from "../../src/core/geometry";

describe("geometry", () => {
  it("TC-7: round-trips display<->canvas at 200% with a pan offset", () => {
    const v: Viewport = { scale: 2, offsetX: 37, offsetY: -12 };
    const canvasPoint = { x: 123.4, y: 88.1 };
    const display = canvasToDisplay(canvasPoint, v);
    const back = displayToCanvas(display, v);
    expect(back.x).toBeCloseTo(canvasPoint.x, 5);
    expect(back.y).toBeCloseTo(canvasPoint.y, 5);
    expect(Math.abs(back.x - canvasPoint.x)).toBeLessThan(0.5);
    expect(Math.abs(back.y - canvasPoint.y)).toBeLessThan(0.5);
  });

  it("TC-8: clamps zoom to 50-400%", () => {
    expect(clampZoom(10)).toBe(50);
    expect(clampZoom(500)).toBe(400);
    expect(clampZoom(150)).toBe(150);
  });

  it("TC-10: arrowhead points (apex at end, 30deg opening, length 4x width)", () => {
    const tol = 0.5;
    const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(tol);

    // Horizontal (0,0)->(100,0), width 10 -> length 40.
    let [l, r] = arrowheadPoints(0, 0, 100, 0, 10);
    near(l.x, 61.363);
    near(l.y, -10.353);
    near(r.x, 61.363);
    near(r.y, 10.353);

    // Vertical (0,0)->(0,100).
    [l, r] = arrowheadPoints(0, 0, 0, 100, 10);
    near(l.x, 10.353);
    near(l.y, 61.363);
    near(r.x, -10.353);
    near(r.y, 61.363);

    // 45 degrees (0,0)->(100,100).
    [l, r] = arrowheadPoints(0, 0, 100, 100, 10);
    near(l.x, 80);
    near(l.y, 65.359);
    near(r.x, 65.359);
    near(r.y, 80);
  });
});
