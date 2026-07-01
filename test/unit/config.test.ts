import { describe, expect, it } from "vitest";
import { parseConfig } from "../../src/core/config";

describe("config TC-19", () => {
  it("parses a valid config", () => {
    const raw = JSON.stringify({
      version: 1,
      settings: { targetFields: ["photos", "inspection_images"], dataField: "annotation_data" },
    });
    const config = parseConfig(raw);
    expect(config).not.toBeNull();
    expect(config?.settings.targetFields).toEqual(["photos", "inspection_images"]);
  });

  it("rejects an empty targetFields array (unconfigured)", () => {
    const raw = JSON.stringify({ version: 1, settings: { targetFields: [], dataField: "" } });
    expect(parseConfig(raw)).toBeNull();
  });

  it("rejects a version mismatch", () => {
    const raw = JSON.stringify({
      version: 2,
      settings: { targetFields: ["photos"], dataField: "" },
    });
    expect(parseConfig(raw)).toBeNull();
  });

  it("treats missing/blank value as unconfigured", () => {
    expect(parseConfig(undefined)).toBeNull();
    expect(parseConfig("")).toBeNull();
    expect(parseConfig("not json")).toBeNull();
  });
});
