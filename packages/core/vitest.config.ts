import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'jsdom',
		environmentOptions: {
			jsdom: {
				url: 'https://test.com',
			},
		},
		setupFiles: ['./vitest.setup.ts'],
		coverage: {
			provider: 'v8',
			include: ['src/**/*.ts'],
			reporter: ['text', 'lcov'],
			reportsDirectory: './coverage',
		},
	},
});
