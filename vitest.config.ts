import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/unit/**/*.test.ts"],
    environment: "node",
    coverage: {
      include: ["src/core/**/*.ts"],
      reporter: ["text", "html"],
    },
  },
});
