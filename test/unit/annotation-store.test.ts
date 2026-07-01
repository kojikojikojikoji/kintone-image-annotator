import { describe, expect, it } from "vitest";
import {
  buildUpdatedStore,
  DATA_FIELD_LIMIT,
  isWithinLimit,
  makeEntry,
  serializeStore,
} from "../../src/core/annotation-store";
import type { Shape } from "../../src/core/shapes";

const sampleShapes: Shape[] = [
  { id: "a", type: "rect", color: "#188038", strokeWidth: 20, x: 0, y: 0, width: 10, height: 10 },
];

function entryFor(name: string) {
  return makeEntry({
    sourceFileKey: `key-${name}`,
    sourceFileName: name,
    canvasWidth: 100,
    canvasHeight: 100,
    shapes: sampleShapes,
  });
}

describe("annotation store TC-17", () => {
  it("adds one entry and prunes an orphan", () => {
    const current = serializeStore({
      version: 1,
      annotations: {
        "a.jpg": entryFor("a.jpg"),
        "b.jpg": entryFor("b.jpg"),
      },
    });
    // Attachments still contain a.jpg (b.jpg was deleted) plus the new c.jpg.
    const { store, key } = buildUpdatedStore({
      rawCurrent: current,
      fileName: "c.jpg",
      entry: entryFor("c.jpg"),
      attachmentNames: ["a.jpg"],
    });
    expect(key).toBe("c.jpg");
    expect(Object.keys(store.annotations).sort()).toEqual(["a.jpg", "c.jpg"]);
  });

  it("starts a clean structure when the current value is invalid JSON", () => {
    const { store } = buildUpdatedStore({
      rawCurrent: "not json {{{",
      fileName: "c.jpg",
      entry: entryFor("c.jpg"),
      attachmentNames: [],
    });
    expect(Object.keys(store.annotations)).toEqual(["c.jpg"]);
    expect(store.version).toBe(1);
  });

  it("TC-3: de-duplicates the key against existing entries", () => {
    const current = serializeStore({
      version: 1,
      annotations: { "c.jpg": entryFor("c.jpg") },
    });
    const { key } = buildUpdatedStore({
      rawCurrent: current,
      fileName: "c.jpg",
      entry: entryFor("c.jpg"),
      attachmentNames: ["c.jpg"],
    });
    expect(key).toBe("c-2.jpg");
  });
});

describe("annotation store TC-18", () => {
  it("flags oversize JSON at the 60,000 char limit", () => {
    expect(isWithinLimit("x".repeat(DATA_FIELD_LIMIT))).toBe(true);
    expect(isWithinLimit("x".repeat(DATA_FIELD_LIMIT - 1))).toBe(true);
    expect(isWithinLimit("x".repeat(DATA_FIELD_LIMIT + 1))).toBe(false);
  });
});
