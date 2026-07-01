import { expect, test } from "@playwright/test";
import { launchButton, login, openRecord, readEnv } from "./helpers";

const env = readEnv();

// TC-20: the launch button appears after the target attachment field only.
test.describe("launch button", () => {
  test.skip(!env, "kintone environment variables are not set");

  test("shows the launch button on a record with a JPEG attachment", async ({ page }) => {
    if (!env) return;
    await login(page, env);
    const recordId = process.env.KINTONE_RECORD_JPEG ?? "1";
    await openRecord(page, env, recordId);
    await expect(page.locator(launchButton).first()).toBeVisible();
  });
});
