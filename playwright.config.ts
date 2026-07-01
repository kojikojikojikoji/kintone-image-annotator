import { defineConfig } from "@playwright/test";

/**
 * E2E runs against a development kintone environment. Connection details come
 * from environment variables so no host or credentials are committed:
 *   KINTONE_BASE_URL   e.g. https://example.cybozu.com
 *   KINTONE_USERNAME
 *   KINTONE_PASSWORD
 *   KINTONE_APP_ID
 * These tests are excluded from CI (see .github/workflows/ci.yml).
 */
export default defineConfig({
  testDir: "./test/e2e",
  timeout: 60000,
  use: {
    baseURL: process.env.KINTONE_BASE_URL,
    headless: true,
    screenshot: "only-on-failure",
  },
  reporter: [["list"]],
});
