import { z } from "zod";
import { disambiguateKey } from "./naming";
import { shapesSchema, type Shape } from "./shapes";

/** Safety margin below the kintone MULTI_LINE_TEXT limit of 64,000 chars (EC-10). */
export const DATA_FIELD_LIMIT = 60000;

const entrySchema = z.object({
  sourceFileKey: z.string(),
  sourceFileName: z.string(),
  canvas: z.object({ width: z.number(), height: z.number() }),
  shapes: shapesSchema,
});

export const storeSchema = z.object({
  version: z.literal(1),
  annotations: z.record(z.string(), entrySchema),
});

export type AnnotationEntry = z.infer<typeof entrySchema>;
export type AnnotationStore = z.infer<typeof storeSchema>;

export function emptyStore(): AnnotationStore {
  return { version: 1, annotations: {} };
}

/**
 * Parse the data field value. Returns null when the value is missing, not JSON,
 * or does not match the schema (EC-9, TC-16).
 */
export function parseStore(raw: string | undefined | null): AnnotationStore | null {
  if (!raw || raw.trim() === "") return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  const result = storeSchema.safeParse(value);
  return result.success ? result.data : null;
}

/** Look up a stored entry by annotated file name. */
export function findEntry(
  store: AnnotationStore | null,
  fileName: string,
): AnnotationEntry | undefined {
  return store?.annotations[fileName];
}

/**
 * Remove entries whose key is not among the current attachment file names
 * (EC-12). `keep` are names that must be retained (e.g. the file just added).
 */
export function pruneOrphans(
  store: AnnotationStore,
  attachmentNames: Iterable<string>,
  keep: Iterable<string> = [],
): AnnotationStore {
  const allowed = new Set<string>(attachmentNames);
  for (const name of keep) allowed.add(name);
  const annotations: Record<string, AnnotationEntry> = {};
  for (const [name, entry] of Object.entries(store.annotations)) {
    if (allowed.has(name)) {
      annotations[name] = entry;
    }
  }
  return { version: 1, annotations };
}

/**
 * Build the updated store for a save: start from the parsed current value (or
 * an empty store when invalid), drop orphan entries, then add the new entry
 * under a de-duplicated key (FR-12, EC-9, EC-12, EC-19, TC-3, TC-17).
 */
export function buildUpdatedStore(params: {
  rawCurrent: string | undefined | null;
  fileName: string;
  entry: AnnotationEntry;
  attachmentNames: Iterable<string>;
}): { store: AnnotationStore; key: string } {
  const current = parseStore(params.rawCurrent) ?? emptyStore();
  const pruned = pruneOrphans(current, params.attachmentNames, [params.fileName]);
  const key = disambiguateKey(params.fileName, Object.keys(pruned.annotations));
  pruned.annotations[key] = params.entry;
  return { store: pruned, key };
}

export function serializeStore(store: AnnotationStore): string {
  return JSON.stringify(store);
}

/** True when the serialized store is small enough to save (EC-10, TC-18). */
export function isWithinLimit(json: string, limit: number = DATA_FIELD_LIMIT): boolean {
  return json.length <= limit;
}

/** Convenience: build an entry from edit state. */
export function makeEntry(params: {
  sourceFileKey: string;
  sourceFileName: string;
  canvasWidth: number;
  canvasHeight: number;
  shapes: Shape[];
}): AnnotationEntry {
  return {
    sourceFileKey: params.sourceFileKey,
    sourceFileName: params.sourceFileName,
    canvas: { width: params.canvasWidth, height: params.canvasHeight },
    shapes: params.shapes,
  };
}
