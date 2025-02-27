import type { JestConfigWithTsJest } from 'ts-jest';
import ngPreset from 'jest-preset-angular/presets';

export default {
	displayName: 'microfrontends-angular',
	...ngPreset.createCjsPreset({
		tsconfig: '<rootDir>/lib/tsconfig.spec.json',
	}),
	roots: ['<rootDir>/lib/src'],
	setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

	// Coverage
	collectCoverageFrom: ['lib/src/**/*.ts'],
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'lcov'],
} as JestConfigWithTsJest;
