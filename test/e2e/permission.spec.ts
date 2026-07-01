import { expect, test } from "@playwright/test";
import { launchButton, login, openRecord, readEnv } from "./helpers";

const env = readEnv();

// TC-23 / TC-28: a user without edit permission (record ACL or process-management
// assignee restriction) does not see the launch button. Configure a second
// account via KINTONE_VIEWER_USERNAME / KINTONE_VIEWER_PASSWORD.
test.describe("edit permission", () => {
  test.skip(!env, "kintone environment variables are not set");

  test("hides the launch button for a view-only user", async ({ page }) => {
    if (!env) return;
    const viewerUser = process.env.KINTONE_VIEWER_USERNAME;
    const viewerPass = process.env.KINTONE_VIEWER_PASSWORD;
    test.skip(!viewerUser || !viewerPass, "viewer credentials are not set");
    if (!viewerUser || !viewerPass) return;

    await login(page, { ...env, username: viewerUser, password: viewerPass });
    const recordId = process.env.KINTONE_RECORD_JPEG ?? "1";
    await openRecord(page, env, recordId);
    await expect(page.locator(launchButton)).toHaveCount(0);
  });
});
