import { describe, expect, it } from "vitest";
import { computeResize } from "../../src/core/resize";

describe("resize", () => {
  it("TC-6: scales the long side to 8000, keeping aspect ratio", () => {
    expect(computeResize(9000, 6000)).toEqual({ width: 8000, height: 5333, resized: true });
    expect(computeResize(8000, 6000)).toEqual({ width: 8000, height: 6000, resized: false });
    expect(computeResize(6000, 9000)).toEqual({ width: 5333, height: 8000, resized: true });
  });

  it("supports the 4096 fallback bound", () => {
    expect(computeResize(9000, 6000, 4096)).toEqual({
      width: 4096,
      height: 2731,
      resized: true,
    });
  });
});
