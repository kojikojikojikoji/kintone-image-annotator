import { expect, test } from "@playwright/test";
import { launchButton, login, openRecord, readEnv } from "./helpers";

const env = readEnv();

// TC-25 / TC-26: unsaved-close confirm, and undo/redo cycle.
test.describe("editor history and close", () => {
  test.skip(!env, "kintone environment variables are not set");

  test("prompts to confirm when closing with unsaved shapes", async ({ page }) => {
    if (!env) return;
    await login(page, env);
    const recordId = process.env.KINTONE_RECORD_JPEG ?? "1";
    await openRecord(page, env, recordId);

    await page.locator(launchButton).first().click();
    await page.locator(".kp-ia-thumb").first().click();
    await expect(page.locator(".kp-ia-editor-dialog")).toBeVisible();

    // Draw one line.
    await page.locator('.kp-ia-tool[aria-label="直線"]').click();
    const canvas = page.locator(".kp-ia-canvas");
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.5);
      await page.mouse.up();
    }

    // Undo then redo.
    await page.locator('.kp-ia-tool:has-text("元に戻す")').click();
    await page.locator('.kp-ia-tool:has-text("やり直す")').click();

    // Escape triggers the unsaved-close confirm.
    await page.keyboard.press("Escape");
    await expect(page.locator(".kp-ia-confirm-message")).toContainText("注釈が保存されていません");
    await page.locator(".kp-ia-btn:has-text('編集に戻る')").click();
    await expect(page.locator(".kp-ia-editor-dialog")).toBeVisible();
  });
});
