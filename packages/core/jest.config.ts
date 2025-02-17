import type { Config } from 'jest';

export default {
	displayName: 'microfrontends',
	roots: ['<rootDir>/src'],
	setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
	transform: {
		'^.+\\.ts$': 'ts-jest',
	},

	// JSDOM
	testEnvironment: 'jsdom',
	testEnvironmentOptions: {
		url: 'https://test.com',
	},

	// Coverage
	collectCoverageFrom: ['src/**/*.ts'],
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'lcov'],
} as Config;
