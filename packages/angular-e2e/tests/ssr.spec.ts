import { expect, test } from '@playwright/test';

test.describe('SSR', () => {
	let unblock: () => void;
	let consoleEntries: any[] = [];
	let pageErrors: any[] = [];

	test.beforeEach(async ({ page }) => {
		// Capture console and page errors
		page.on('console', (m) => consoleEntries.push(m));
		page.on('pageerror', (e) => pageErrors.push(e));

		// Block JS loading
		await page.route('**/*.js', async (route) => {
			await new Promise<void>((resolve) => (unblock = resolve)); // stall
			await route.continue();
		});
	});

	test.afterEach(async ({ page }) => {
		await page.unroute('**/*.js');
		consoleEntries = [];
		pageErrors = [];
	});

	test('Main Page', async ({ page }) => {
		// Wait for SSR
		await page.goto(`/`, { waitUntil: 'commit' });

		// Page is rendered
		await page.locator('p', { hasText: 'no client messages' }).waitFor();
		await page.locator('p', { hasText: 'no host messages' }).waitFor();

		// Unblock JS
		unblock!();

		// Make sure client and host start communicating
		await page.locator('p', { hasText: 'client-connect' }).waitFor();
		await page.locator('p', { hasText: 'host-connect' }).waitFor();

		// Make sure no errors or messages in console
		expect(pageErrors.length).toBe(0);
		expect(consoleEntries.length).toBe(0);
	});
});
