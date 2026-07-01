import { resolve } from "node:path";
import { defineConfig } from "vite";

/**
 * kintone plugins load each entry as a standalone <script>, so every entry is
 * bundled as a self-contained IIFE with all dependencies inlined (no CDN, no
 * ES module imports at runtime). IIFE format supports one entry per build, so
 * the build script runs Vite once per entry, selecting it with KP_ENTRY.
 */
const entries: Record<string, string> = {
  desktop: resolve(__dirname, "src/desktop/index.ts"),
  config: resolve(__dirname, "src/config/index.ts"),
};

const entry = process.env.KP_ENTRY ?? "desktop";
const entryPath = entries[entry];
if (!entryPath) {
  throw new Error(`Unknown KP_ENTRY: ${entry}. Expected one of ${Object.keys(entries).join(", ")}`);
}

export default defineConfig({
  build: {
    // Only the first entry clears dist; later entries append their file.
    emptyOutDir: entry === "desktop",
    target: "es2019",
    minify: true,
    lib: {
      entry: entryPath,
      formats: ["iife"],
      name: `kpImageAnnotator_${entry}`,
      fileName: () => `${entry}.js`,
    },
    outDir: "dist",
    rollupOptions: {
      output: {
        // Keep a stable css file name for the config entry.
        assetFileNames: "[name][extname]",
      },
    },
  },
});
