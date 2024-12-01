import { existsSync } from "fs";
import { chromium } from '@playwright/test';
import Errorlogger from './Errorlogger';

const STORAGE_STATE_PATH = './tmp/storageState.json';

export default async function playwrightAutomation(url: string) {
  const storageStateExists = existsSync(STORAGE_STATE_PATH);

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-gl-drawing-for-tests'], // disable GPU drawing for improved performance in headless mode.
  });

  // Load the storage state start with the previous Session/Cookie.
  // This prevents Netflix from sending emails about new devices using the account.
  const browserContext = await browser.newContext({
    storageState: storageStateExists ? STORAGE_STATE_PATH : undefined
  });
  const page = await browserContext.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.locator("button[data-uia='set-primary-location-action']").click();
    await browserContext.storageState({ path: STORAGE_STATE_PATH });
  } catch (error) {
    throw new Errorlogger(`No Netflix location update button found for (${url}), maybe link timeout already expired`);
  } finally {
    await browser.close();
  }

  return Promise.resolve();
}
