import { describe, expect, it } from "vitest";
import { createTextShape } from "../../src/core/shapes";
import { parseStore } from "../../src/core/annotation-store";

describe("shapes", () => {
  it("TC-15: createTextShape returns null for empty/whitespace text", () => {
    expect(createTextShape({ color: "#d93025", fontSize: 20, x: 0, y: 0, text: "" })).toBeNull();
    expect(
      createTextShape({ color: "#d93025", fontSize: 20, x: 0, y: 0, text: "   \n " }),
    ).toBeNull();
    const shape = createTextShape({ color: "#d93025", fontSize: 20, x: 1, y: 2, text: "ok" });
    expect(shape).not.toBeNull();
    expect(shape?.type).toBe("text");
  });
});

describe("shape/store validation TC-16", () => {
  const entry = (shape: unknown) => ({
    version: 1,
    annotations: {
      "f.jpg": {
        sourceFileKey: "k",
        sourceFileName: "o.jpg",
        canvas: { width: 10, height: 10 },
        shapes: [shape],
      },
    },
  });

  it("accepts valid shapes only", () => {
    const valid = entry({
      id: "a",
      type: "line",
      color: "#d93025",
      strokeWidth: 2,
      x1: 0,
      y1: 0,
      x2: 1,
      y2: 1,
    });
    expect(parseStore(JSON.stringify(valid))).not.toBeNull();
  });

  it("rejects missing shapes array", () => {
    const bad = {
      version: 1,
      annotations: {
        "f.jpg": { sourceFileKey: "k", sourceFileName: "o.jpg", canvas: { width: 10, height: 10 } },
      },
    };
    expect(parseStore(JSON.stringify(bad))).toBeNull();
  });

  it("rejects an unknown shape type", () => {
    const bad = entry({ id: "a", type: "star", color: "#d93025", strokeWidth: 2 });
    expect(parseStore(JSON.stringify(bad))).toBeNull();
  });

  it("rejects string coordinates", () => {
    const bad = entry({
      id: "a",
      type: "line",
      color: "#d93025",
      strokeWidth: 2,
      x1: "0",
      y1: 0,
      x2: 1,
      y2: 1,
    });
    expect(parseStore(JSON.stringify(bad))).toBeNull();
  });
});
