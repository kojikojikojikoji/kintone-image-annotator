/** Output format decision for the rasterized image (FR-11, TC-1). */
export interface OutputFormat {
  type: "jpeg" | "png";
  mime: "image/jpeg" | "image/png";
  /** Only present for JPEG. */
  quality?: number;
}

/**
 * JPEG source keeps JPEG at quality 0.9; PNG/WebP/GIF (and anything else that
 * reached the editor) is written as PNG to preserve transparency (EC-17).
 */
export function decideOutput(contentType: string): OutputFormat {
  if (contentType === "image/jpeg") {
    return { type: "jpeg", mime: "image/jpeg", quality: 0.9 };
  }
  return { type: "png", mime: "image/png" };
}

function splitExtension(fileName: string): { base: string; ext: string } {
  const dot = fileName.lastIndexOf(".");
  if (dot <= 0) {
    return { base: fileName, ext: "" };
  }
  return { base: fileName.slice(0, dot), ext: fileName.slice(dot + 1) };
}

function pad(value: number, width: number): string {
  return value.toString().padStart(width, "0");
}

/** Local timestamp in `YYYYMMDD-HHmmss` (FR-11). */
export function formatTimestamp(date: Date): string {
  const y = pad(date.getFullYear(), 4);
  const mo = pad(date.getMonth() + 1, 2);
  const d = pad(date.getDate(), 2);
  const h = pad(date.getHours(), 2);
  const mi = pad(date.getMinutes(), 2);
  const s = pad(date.getSeconds(), 2);
  return `${y}${mo}${d}-${h}${mi}${s}`;
}

/**
 * Build the annotated file name (FR-11, TC-2). JPEG output keeps the original
 * extension (or `jpg` when the source had none); PNG output always uses `png`.
 */
export function buildAnnotatedFileName(
  originalName: string,
  output: OutputFormat,
  now: Date,
): string {
  const { base, ext } = splitExtension(originalName);
  const stamp = formatTimestamp(now);
  const outExt = output.type === "jpeg" ? ext || "jpg" : "png";
  return `${base}_annotated_${stamp}.${outExt}`;
}

/**
 * Return a file-name key not already present in `existing`, appending `-2`,
 * `-3`, ... before the extension on collision (FR-12, EC-19, TC-3).
 */
export function disambiguateKey(baseName: string, existing: Iterable<string>): string {
  const taken = new Set(existing);
  if (!taken.has(baseName)) {
    return baseName;
  }
  const { base, ext } = splitExtension(baseName);
  const suffix = ext ? `.${ext}` : "";
  let n = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const candidate = `${base}-${n}${suffix}`;
    if (!taken.has(candidate)) {
      return candidate;
    }
    n += 1;
  }
}
