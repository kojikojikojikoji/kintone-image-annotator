import { arrowheadPoints } from "./geometry";
import type { Shape } from "./shapes";

/**
 * The subset of CanvasRenderingContext2D used to draw shapes. A real 2D context
 * satisfies this structurally; unit tests pass a recording mock (TC-13, TC-14).
 */
export interface RenderContext {
  strokeStyle: string | CanvasGradient | CanvasPattern;
  fillStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  font: string;
  textBaseline: CanvasTextBaseline;
  save(): void;
  restore(): void;
  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  stroke(): void;
  fill(): void;
  strokeRect(x: number, y: number, w: number, h: number): void;
  ellipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    startAngle: number,
    endAngle: number,
  ): void;
  fillText(text: string, x: number, y: number): void;
}

/** Draw one shape onto the context in canvas coordinates. */
export function drawShape(ctx: RenderContext, shape: Shape): void {
  ctx.save();
  switch (shape.type) {
    case "pen": {
      ctx.strokeStyle = shape.color;
      ctx.lineWidth = shape.strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(shape.points[0].x, shape.points[0].y);
      for (let i = 1; i < shape.points.length; i += 1) {
        ctx.lineTo(shape.points[i].x, shape.points[i].y);
      }
      ctx.stroke();
      break;
    }
    case "line": {
      ctx.strokeStyle = shape.color;
      ctx.lineWidth = shape.strokeWidth;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(shape.x1, shape.y1);
      ctx.lineTo(shape.x2, shape.y2);
      ctx.stroke();
      break;
    }
    case "arrow": {
      ctx.strokeStyle = shape.color;
      ctx.fillStyle = shape.color;
      ctx.lineWidth = shape.strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      // Shaft.
      ctx.beginPath();
      ctx.moveTo(shape.x1, shape.y1);
      ctx.lineTo(shape.x2, shape.y2);
      ctx.stroke();
      // Filled arrowhead triangle with apex at the end point.
      const [left, right] = arrowheadPoints(
        shape.x1,
        shape.y1,
        shape.x2,
        shape.y2,
        shape.strokeWidth,
      );
      ctx.beginPath();
      ctx.moveTo(shape.x2, shape.y2);
      ctx.lineTo(left.x, left.y);
      ctx.lineTo(right.x, right.y);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "rect": {
      ctx.strokeStyle = shape.color;
      ctx.lineWidth = shape.strokeWidth;
      ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
      break;
    }
    case "ellipse": {
      ctx.strokeStyle = shape.color;
      ctx.lineWidth = shape.strokeWidth;
      const rx = Math.abs(shape.width) / 2;
      const ry = Math.abs(shape.height) / 2;
      const cx = shape.x + shape.width / 2;
      const cy = shape.y + shape.height / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "text": {
      ctx.fillStyle = shape.color;
      ctx.font = `${shape.fontSize}px sans-serif`;
      ctx.textBaseline = "top";
      const lines = shape.text.split("\n");
      for (let i = 0; i < lines.length; i += 1) {
        ctx.fillText(lines[i], shape.x, shape.y + i * shape.fontSize);
      }
      break;
    }
  }
  ctx.restore();
}

/** Draw shapes in array order so later shapes stack on top (TC-14). */
export function drawShapes(ctx: RenderContext, shapes: Shape[]): void {
  for (const shape of shapes) {
    drawShape(ctx, shape);
  }
}
