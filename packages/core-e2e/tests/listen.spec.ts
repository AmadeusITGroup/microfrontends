import { expect, test } from '@playwright/test';

test('listen', async ({ page }) => {
	await page.goto(`listen`);

	const messagesContainer = page.locator('#host-messages');
	await expect(messagesContainer).toContainText('client-0-handshake');
	await expect(messagesContainer).toContainText('client-0-connect');
	await expect(messagesContainer).toContainText('client-1-handshake');
	await expect(messagesContainer).toContainText('client-1-connect');
});
