import { describe, expect, it } from "vitest";
import {
  buildAnnotatedFileName,
  decideOutput,
  disambiguateKey,
  formatTimestamp,
} from "../../src/core/naming";

describe("naming", () => {
  it("TC-1: decides output format by contentType", () => {
    expect(decideOutput("image/jpeg")).toEqual({
      type: "jpeg",
      mime: "image/jpeg",
      quality: 0.9,
    });
    for (const ct of ["image/png", "image/webp", "image/gif"]) {
      expect(decideOutput(ct)).toEqual({ type: "png", mime: "image/png" });
    }
  });

  it("TC-2: builds annotated file names for a fixed time", () => {
    const now = new Date(2026, 6, 1, 15, 30, 12); // 2026-07-01 15:30:12 local
    expect(buildAnnotatedFileName("genba01.jpg", decideOutput("image/jpeg"), now)).toBe(
      "genba01_annotated_20260701-153012.jpg",
    );
    expect(buildAnnotatedFileName("shipping.webp", decideOutput("image/webp"), now)).toBe(
      "shipping_annotated_20260701-153012.png",
    );
    expect(buildAnnotatedFileName("photo", decideOutput("image/jpeg"), now)).toBe(
      "photo_annotated_20260701-153012.jpg",
    );
  });

  it("formats a zero-padded timestamp", () => {
    expect(formatTimestamp(new Date(2026, 0, 5, 3, 4, 9))).toBe("20260105-030409");
  });

  it("TC-3: appends -2, -3 on key collision", () => {
    const base = "genba01_annotated_20260701-153012.jpg";
    expect(disambiguateKey(base, [])).toBe(base);
    expect(disambiguateKey(base, [base])).toBe("genba01_annotated_20260701-153012-2.jpg");
    expect(disambiguateKey(base, [base, "genba01_annotated_20260701-153012-2.jpg"])).toBe(
      "genba01_annotated_20260701-153012-3.jpg",
    );
  });
});
