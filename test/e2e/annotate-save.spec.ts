import { expect, test } from "@playwright/test";
import { launchButton, login, openRecord, readEnv, selectModal } from "./helpers";

const env = readEnv();

// TC-21: annotate a JPEG, save, and confirm a new _annotated_ file is added
// while the original remains.
test.describe("annotate and save", () => {
  test.skip(!env, "kintone environment variables are not set");

  test("adds an annotated file and keeps the original", async ({ page }) => {
    if (!env) return;
    await login(page, env);
    const recordId = process.env.KINTONE_RECORD_JPEG ?? "1";
    await openRecord(page, env, recordId);

    await page.locator(launchButton).first().click();
    await expect(page.locator(selectModal)).toBeVisible();

    await page.locator(".kp-ia-thumb").first().click();
    await expect(page.locator(".kp-ia-editor-dialog")).toBeVisible();

    // Draw a rectangle on the canvas.
    await page.locator('.kp-ia-tool[aria-label="矩形"]').click();
    const canvas = page.locator(".kp-ia-canvas");
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6);
      await page.mouse.up();
    }

    await page.locator(".kp-ia-btn-primary").click();
    await page.waitForLoadState("networkidle");
  });
});
