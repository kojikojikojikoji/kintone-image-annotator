import { z } from "zod";

/** The six preset colors offered by the toolbar (FR-6). */
export const PRESET_COLORS = [
  "#d93025", // red
  "#e8710a", // orange
  "#f9ab00", // yellow
  "#188038", // green
  "#1a73e8", // blue
  "#202124", // black
] as const;

export type PresetColor = (typeof PRESET_COLORS)[number];

export type StrokeLevel = "thin" | "medium" | "thick";

export type ToolKind = "pen" | "line" | "arrow" | "rect" | "ellipse" | "text";

export interface Point {
  x: number;
  y: number;
}

export interface PenShape {
  id: string;
  type: "pen";
  color: string;
  strokeWidth: number;
  points: Point[];
}

export interface LineShape {
  id: string;
  type: "line";
  color: string;
  strokeWidth: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ArrowShape {
  id: string;
  type: "arrow";
  color: string;
  strokeWidth: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface RectShape {
  id: string;
  type: "rect";
  color: string;
  strokeWidth: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EllipseShape {
  id: string;
  type: "ellipse";
  color: string;
  strokeWidth: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextShape {
  id: string;
  type: "text";
  color: string;
  fontSize: number;
  x: number;
  y: number;
  text: string;
}

export type Shape = PenShape | LineShape | ArrowShape | RectShape | EllipseShape | TextShape;

// --- zod schemas (5.3) ---

const pointSchema = z.object({ x: z.number(), y: z.number() });
// Colors are validated as #rrggbb hex. Values outside the preset still parse so
// that older data is not discarded, but the toolbar only produces presets.
const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const penSchema = z.object({
  id: z.string(),
  type: z.literal("pen"),
  color: colorSchema,
  strokeWidth: z.number().positive(),
  points: z.array(pointSchema).min(2),
});

const lineSchema = z.object({
  id: z.string(),
  type: z.literal("line"),
  color: colorSchema,
  strokeWidth: z.number().positive(),
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number(),
});

const arrowSchema = z.object({
  id: z.string(),
  type: z.literal("arrow"),
  color: colorSchema,
  strokeWidth: z.number().positive(),
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number(),
});

const rectSchema = z.object({
  id: z.string(),
  type: z.literal("rect"),
  color: colorSchema,
  strokeWidth: z.number().positive(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

const ellipseSchema = z.object({
  id: z.string(),
  type: z.literal("ellipse"),
  color: colorSchema,
  strokeWidth: z.number().positive(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

const textSchema = z.object({
  id: z.string(),
  type: z.literal("text"),
  color: colorSchema,
  fontSize: z.number().positive(),
  x: z.number(),
  y: z.number(),
  text: z.string(),
});

export const shapeSchema = z.discriminatedUnion("type", [
  penSchema,
  lineSchema,
  arrowSchema,
  rectSchema,
  ellipseSchema,
  textSchema,
]);

export const shapesSchema = z.array(shapeSchema);

/** Parse a shapes array, returning null when the value fails validation. */
export function parseShapes(value: unknown): Shape[] | null {
  const result = shapesSchema.safeParse(value);
  return result.success ? (result.data as Shape[]) : null;
}

let idCounter = 0;

/** Generate an id that is unique within one editor session. */
export function generateId(): string {
  idCounter += 1;
  return `${Date.now().toString(36)}${idCounter.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 5)}`;
}

/**
 * Build a text shape. Returns null for empty or whitespace-only text so the
 * caller can drop the overlay without adding a shape (FR-7, EC-13).
 */
export function createTextShape(params: {
  color: string;
  fontSize: number;
  x: number;
  y: number;
  text: string;
  id?: string;
}): TextShape | null {
  if (params.text.trim() === "") {
    return null;
  }
  return {
    id: params.id ?? generateId(),
    type: "text",
    color: params.color,
    fontSize: params.fontSize,
    x: params.x,
    y: params.y,
    text: params.text,
  };
}
