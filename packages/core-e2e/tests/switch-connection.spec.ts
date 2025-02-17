import { expect, Frame, Page, test } from '@playwright/test';

test('switch-connection', async ({ page }) => {
	await page.goto(`switch-connection`);

	const messagesContainer = page.locator('#messages');
	const messages = messagesContainer.locator('[class^="client-"]');
	const connectContainer = page.locator('#connect');
	const connectMessages = connectContainer.locator('[class^="client-"]');
	const disconnectMessagesContainer = page.locator('#disconnected');
	const disconnectMessages = disconnectMessagesContainer.locator('[class^="client-"]');

	// wait to have iframe #client-0 initialiazed
	await page.waitForSelector('#client-0');
	// in host: at init one connect message, one message and 0 disconnect messages
	expect(await messages.count()).toBe(1);
	expect(await connectMessages.count()).toBe(1);
	expect(await disconnectMessages.count()).toBe(0);

	// Locate first iframe
	let frame0 = page.frame({ name: 'client-0' });
	await frame0?.waitForSelector('.host-test-host');
	expect(await frame0?.locator('.host-test-host')?.count()).toBe(1);
	expect(await frame0?.locator('.host-connect')?.count()).toBe(1);

	// simulate page change ###########################################
	// when removing iframe0, iframe1 will be created
	await closeIframe(frame0!, page, 'client-0');

	// in host: one disconnect message
	expect(await disconnectMessages.count()).toBe(1);

	// wait to have iframe #client-1 initialiazed
	await page.waitForSelector('#client-1');

	// Locate second iframe
	const frame1 = page.frame({ name: 'client-1' });
	await frame1?.waitForSelector('.host-test-host');
	expect(await frame1?.locator('.host-test-host')?.count()).toBe(1);
	expect(await frame1?.locator('.host-connect')?.count()).toBe(1);

	// in host: 2 messages and one disconnect message
	expect(await messages.count()).toBe(2);
	expect(await connectMessages.count()).toBe(2);
	expect(await disconnectMessages.count()).toBe(1);

	// simulate page change ###########################################
	// when removing the iframe1, iframe0 will be created
	await closeIframe(frame1!, page, 'client-1');

	// wait to have iframe #client-0 initialiazed
	await page.waitForSelector('#client-0');

	// Locate again iframe0
	frame0 = page.frame({ name: 'client-0' });
	// wait for message received from host
	await frame0?.waitForSelector('.host-test-host');
	expect(await frame0?.locator('.host-test-host')?.count()).toBe(1);
	expect(await frame0?.locator('.host-connect')?.count()).toBe(1);

	// in host: 3 messages and 2 disconnect messages
	expect(await messages.count()).toBe(3);
	expect(await connectMessages.count()).toBe(3);
	expect(await disconnectMessages.count()).toBe(2);

	// check number of messages in host received from each client
	expect(await messagesContainer.locator('[class^="client-0"]').count()).toBe(2);
	expect(await messagesContainer.locator('[class^="client-1"]').count()).toBe(1);
	expect(await disconnectMessagesContainer.locator('[class^="client-0"]').count()).toBe(1);
	expect(await disconnectMessagesContainer.locator('[class^="client-1"]').count()).toBe(1);
	expect(await connectContainer.locator('[class^="client-0"]').count()).toBe(2);
	expect(await connectContainer.locator('[class^="client-1"]').count()).toBe(1);
});

/**
 * Click disconnect button inside the iframe and remove the iframe element after that
 * @param frame
 * @param page
 * @param elementIframeId
 */
async function closeIframe(frame: Frame, page: Page, elementIframeId: string) {
	await frame.getByRole('button', { name: 'disconnect' }).click();

	// Remove the iframe
	await page.evaluate((iframeId) => {
		const iframe = document.getElementById(iframeId) as HTMLIFrameElement;
		if (iframe) {
			iframe.remove();
		}
	}, elementIframeId);
}
