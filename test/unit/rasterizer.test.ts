import { describe, expect, it } from "vitest";
import { drawShape, drawShapes, type RenderContext } from "../../src/core/rasterizer";
import type { Shape } from "../../src/core/shapes";

type Call = [string, ...unknown[]];

function createMockCtx(): { ctx: RenderContext; calls: Call[] } {
  const calls: Call[] = [];
  const ctx = {
    strokeStyle: "",
    fillStyle: "",
    lineWidth: 0,
    lineCap: "butt",
    lineJoin: "miter",
    font: "",
    textBaseline: "alphabetic",
    save: () => calls.push(["save"]),
    restore: () => calls.push(["restore"]),
    beginPath: () => calls.push(["beginPath"]),
    closePath: () => calls.push(["closePath"]),
    moveTo: (x: number, y: number) => calls.push(["moveTo", x, y]),
    lineTo: (x: number, y: number) => calls.push(["lineTo", x, y]),
    stroke: () =>
      calls.push(["stroke", { strokeStyle: ctx.strokeStyle, lineWidth: ctx.lineWidth }]),
    fill: () => calls.push(["fill", { fillStyle: ctx.fillStyle }]),
    strokeRect: (x: number, y: number, w: number, h: number) =>
      calls.push([
        "strokeRect",
        x,
        y,
        w,
        h,
        { strokeStyle: ctx.strokeStyle, lineWidth: ctx.lineWidth },
      ]),
    ellipse: (...a: number[]) => calls.push(["ellipse", ...a]),
    fillText: (t: string, x: number, y: number) =>
      calls.push(["fillText", t, x, y, { fillStyle: ctx.fillStyle, font: ctx.font }]),
  } as unknown as RenderContext & {
    strokeStyle: string;
    fillStyle: string;
    lineWidth: number;
    font: string;
  };
  return { ctx, calls };
}

const names = (calls: Call[]) => calls.map((c) => c[0]);

describe("rasterizer TC-13", () => {
  it("pen: beginPath + moveTo + lineTo run + stroke", () => {
    const { ctx, calls } = createMockCtx();
    const pen: Shape = {
      id: "1",
      type: "pen",
      color: "#d93025",
      strokeWidth: 20,
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
        { x: 20, y: 5 },
      ],
    };
    drawShape(ctx, pen);
    expect(names(calls)).toEqual([
      "save",
      "beginPath",
      "moveTo",
      "lineTo",
      "lineTo",
      "stroke",
      "restore",
    ]);
    const stroke = calls.find((c) => c[0] === "stroke") as Call;
    expect(stroke[1]).toEqual({ strokeStyle: "#d93025", lineWidth: 20 });
  });

  it("line: moveTo + lineTo + stroke", () => {
    const { ctx, calls } = createMockCtx();
    drawShape(ctx, {
      id: "1",
      type: "line",
      color: "#1a73e8",
      strokeWidth: 20,
      x1: 0,
      y1: 0,
      x2: 100,
      y2: 0,
    });
    expect(names(calls)).toEqual(["save", "beginPath", "moveTo", "lineTo", "stroke", "restore"]);
  });

  it("arrow: shaft stroke + filled triangle", () => {
    const { ctx, calls } = createMockCtx();
    drawShape(ctx, {
      id: "1",
      type: "arrow",
      color: "#d93025",
      strokeWidth: 40,
      x1: 0,
      y1: 0,
      x2: 100,
      y2: 0,
    });
    expect(names(calls)).toEqual([
      "save",
      "beginPath",
      "moveTo",
      "lineTo",
      "stroke",
      "beginPath",
      "moveTo",
      "lineTo",
      "lineTo",
      "closePath",
      "fill",
      "restore",
    ]);
    const fill = calls.find((c) => c[0] === "fill") as Call;
    expect(fill[1]).toEqual({ fillStyle: "#d93025" });
  });

  it("rect: strokeRect", () => {
    const { ctx, calls } = createMockCtx();
    drawShape(ctx, {
      id: "1",
      type: "rect",
      color: "#188038",
      strokeWidth: 20,
      x: 300,
      y: 400,
      width: 600,
      height: 350,
    });
    const rect = calls.find((c) => c[0] === "strokeRect") as Call;
    expect(rect.slice(1, 5)).toEqual([300, 400, 600, 350]);
    expect(rect[5]).toEqual({ strokeStyle: "#188038", lineWidth: 20 });
  });

  it("ellipse: ellipse + stroke", () => {
    const { ctx, calls } = createMockCtx();
    drawShape(ctx, {
      id: "1",
      type: "ellipse",
      color: "#202124",
      strokeWidth: 20,
      x: 1000,
      y: 200,
      width: 400,
      height: 400,
    });
    expect(names(calls)).toEqual(["save", "beginPath", "ellipse", "stroke", "restore"]);
    const ell = calls.find((c) => c[0] === "ellipse") as Call;
    // center (1200,400), radii 200/200
    expect(ell.slice(1, 5)).toEqual([1200, 400, 200, 200]);
  });

  it("text: one fillText per line with color and font", () => {
    const { ctx, calls } = createMockCtx();
    drawShape(ctx, {
      id: "1",
      type: "text",
      color: "#d93025",
      fontSize: 121,
      x: 150,
      y: 1800,
      text: "line1\nline2",
    });
    const texts = calls.filter((c) => c[0] === "fillText");
    expect(texts.length).toBe(2);
    expect(texts[0]).toEqual([
      "fillText",
      "line1",
      150,
      1800,
      { fillStyle: "#d93025", font: "121px sans-serif" },
    ]);
    expect(texts[1]).toEqual([
      "fillText",
      "line2",
      150,
      1921,
      { fillStyle: "#d93025", font: "121px sans-serif" },
    ]);
  });
});

describe("rasterizer TC-14", () => {
  it("draws shapes in array order (stacking)", () => {
    const { ctx, calls } = createMockCtx();
    const shapes: Shape[] = [
      {
        id: "1",
        type: "rect",
        color: "#188038",
        strokeWidth: 20,
        x: 0,
        y: 0,
        width: 10,
        height: 10,
      },
      { id: "2", type: "line", color: "#1a73e8", strokeWidth: 20, x1: 0, y1: 0, x2: 5, y2: 5 },
    ];
    drawShapes(ctx, shapes);
    const rectIndex = calls.findIndex((c) => c[0] === "strokeRect");
    const lineIndex = calls.findIndex((c) => c[0] === "lineTo");
    expect(rectIndex).toBeGreaterThanOrEqual(0);
    expect(lineIndex).toBeGreaterThan(rectIndex);
  });
});
