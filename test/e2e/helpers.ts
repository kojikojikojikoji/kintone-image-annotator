import { expect, type Page } from "@playwright/test";

export interface KintoneEnv {
  baseUrl: string;
  username: string;
  password: string;
  appId: string;
}

/** Read the kintone environment, or null when not fully configured. */
export function readEnv(): KintoneEnv | null {
  const baseUrl = process.env.KINTONE_BASE_URL;
  const username = process.env.KINTONE_USERNAME;
  const password = process.env.KINTONE_PASSWORD;
  const appId = process.env.KINTONE_APP_ID;
  if (!baseUrl || !username || !password || !appId) return null;
  return { baseUrl, username, password, appId };
}

/** Log in through the kintone form. */
export async function login(page: Page, env: KintoneEnv): Promise<void> {
  await page.goto(`${env.baseUrl}/login`);
  await page.fill('input[name="username"]', env.username);
  await page.fill('input[name="password"]', env.password);
  await page.click('.login-button, input[type="submit"]');
  await page.waitForLoadState("networkidle");
}

/** Open a record detail screen by id. */
export async function openRecord(page: Page, env: KintoneEnv, recordId: string): Promise<void> {
  await page.goto(`${env.baseUrl}/k/${env.appId}/show#record=${recordId}`);
  await page.waitForLoadState("networkidle");
}

export const launchButton = ".kp-ia-launch-btn";
export const selectModal = ".kp-ia-modal-dialog";

export async function expectVisible(page: Page, selector: string): Promise<void> {
  await expect(page.locator(selector).first()).toBeVisible();
}
