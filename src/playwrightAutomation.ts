import { chromium } from '@playwright/test';
import Errorlogger from './Errorlogger';

export default async function playwrightAutomation(url: string) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(url);
    await page.locator("button[data-uia='set-primary-location-action']").click();
  } catch (error) {
    throw new Errorlogger(`No Netflix location update button found for (${url}), maybe link timeout already expired`);
  }

  await browser.close();
  return Promise.resolve();
}
