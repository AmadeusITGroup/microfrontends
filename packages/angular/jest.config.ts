import { Config } from 'jest';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
globalThis.ngJest = {
	skipNgcc: true,
};

export default {
	displayName: 'microfrontends-angular',
	preset: 'jest-preset-angular',
	roots: ['<rootDir>/lib/src'],
	setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

	// Angular setup
	transform: {
		'^.+\\.tsx?$': [
			'jest-preset-angular',
			{
				tsconfig: '<rootDir>/lib/tsconfig.spec.json',
				stringifyContentPathRegex: '\\.html$',
			},
		],
	},
	snapshotSerializers: [
		'jest-preset-angular/build/serializers/no-ng-attributes',
		'jest-preset-angular/build/serializers/ng-snapshot',
		'jest-preset-angular/build/serializers/html-comment',
	],

	// Coverage
	collectCoverageFrom: ['lib/src/**/*.ts'],
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'lcov'],
} as Config;
