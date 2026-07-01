import { expect, test } from "@playwright/test";
import { launchButton, login, openRecord, readEnv, selectModal } from "./helpers";

const env = readEnv();

// TC-24: a record with only a PDF attachment shows all thumbnails greyed out
// and the "no annotatable image" message.
test.describe("unsupported format", () => {
  test.skip(!env, "kintone environment variables are not set");

  test("shows the empty message for a PDF-only record", async ({ page }) => {
    if (!env) return;
    await login(page, env);
    const recordId = process.env.KINTONE_RECORD_PDF ?? "2";
    await openRecord(page, env, recordId);

    await page.locator(launchButton).first().click();
    await expect(page.locator(selectModal)).toBeVisible();
    await expect(page.locator(".kp-ia-empty")).toContainText("注釈できる画像がありません");
  });
});
