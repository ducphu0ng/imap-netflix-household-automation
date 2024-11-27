import { existsSync } from "node:fs";
import { chromium } from '@playwright/test';
import Errorlogger from './Errorlogger';

export default async function playwrightAutomation(url: string) {
  const STORAGE_STATE_PATH = './tmp/storageState.json';
  const storageStateExists = existsSync(STORAGE_STATE_PATH);

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-gl-drawing-for-tests'], // disable GPU drawing for improved performance in headless mode.
  });

  // Load the storage state if it exists; otherwise, start with a new context.
  // This prevents Netflix from sending emails about new devices using the account.
  const context = await browser.newContext(
      storageStateExists ? { storageState: STORAGE_STATE_PATH } : {}
  );
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.locator("button[data-uia='set-primary-location-action']").click();
  } catch (error) {
    throw new Errorlogger(`No Netflix location update button found for (${url}), maybe link timeout already expired`);
  } finally {
    await browser.close();
  }

  return Promise.resolve();
}
