import { checkMessageHasCorrectStructure, checkOriginIsValid } from './utils';

describe('checkMessageHasCorrectStructure()', () => {
	test(`should not throw when receiving a correctly structured message`, () => {
		expect(() =>
			checkMessageHasCorrectStructure({
				from: 'from',
				to: [],
				payload: {
					type: 'known',
					version: '1.0',
				},
			}),
		).not.toThrow();
	});

	test(`should throw when receiving an empty message`, () => {
		expect(() => checkMessageHasCorrectStructure({} as any)).toThrow(
			`Message should have 'from'(string) and 'to'(string|string[]) properties`,
		);

		expect(() => checkMessageHasCorrectStructure({ from: 'from' } as any)).toThrow(
			`Message should have 'from'(string) and 'to'(string|string[]) properties`,
		);

		expect(() => checkMessageHasCorrectStructure({ to: [] } as any)).toThrow(
			`Message should have 'from'(string) and 'to'(string|string[]) properties`,
		);
	});

	test(`should throw when receiving a message without payload`, () => {
		expect(() => checkMessageHasCorrectStructure({ from: 'from', to: [] } as any)).toThrow(
			`Message should have 'payload' property that has 'type'(string) defined`,
		);
	});

	test(`should throw when receiving a message with payload without type`, () => {
		expect(() =>
			checkMessageHasCorrectStructure({
				from: 'from',
				to: [],
				payload: {
					version: '1.0',
				},
			} as any),
		).toThrow(`Message should have 'payload' property that has 'type'(string) defined`);
	});

	test(`should throw when receiving a message with payload without version`, () => {
		expect(() =>
			checkMessageHasCorrectStructure({
				from: 'from',
				to: [],
				payload: {
					type: 'foo',
				},
			} as any),
		).not.toThrow();

		expect(() =>
			checkMessageHasCorrectStructure(
				{
					from: 'from',
					to: [],
					payload: {
						type: 'foo',
					},
				} as any,
				'version',
			),
		).toThrow(`Message should have 'payload' property that has 'version'(string) defined`);
	});
});

describe('checkOriginIsValid()', () => {
	test(`should not throw when receiving a valid origin`, () => {
		expect(() => checkOriginIsValid('https://test.com')).not.toThrow();
	});

	test(`should throw when receiving an invalid origin`, () => {
		expect(() => checkOriginIsValid(null as any)).toThrow(`'null' is not a valid URL`);
		expect(() => checkOriginIsValid(undefined as any)).toThrow(`'undefined' is not a valid URL`);
		expect(() => checkOriginIsValid('not a valid URL')).toThrow(
			`'not a valid URL' is not a valid URL`,
		);
	});

	test(`should throw when receiving an erroneous origin`, () => {
		expect(() => checkOriginIsValid('https://test.com/')).toThrow(
			`'https://test.com/' is not a valid origin, did you mean 'https://test.com'?`,
		);
	});
});
