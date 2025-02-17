import { test } from '@playwright/test';

test('handshake', async ({ page }) => {
	await page.goto(`handshake`);
	await page.waitForSelector('#client-0');
	await page.waitForSelector('#client-1');
	await page.waitForSelector('#client-2');
	await page.waitForSelector('#client-3');
	await page.waitForSelector('#client-4');
	await page.waitForSelector('#client-5');
});
