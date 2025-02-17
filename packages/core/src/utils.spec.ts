import { checkMessageHasCorrectStructure } from './utils';

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
			`Message should have 'payload' property that has 'type'(string) and 'version'(string) defined`,
		);
	});

	test(`should throw when receiving a message with payload without type or version`, () => {
		expect(() =>
			checkMessageHasCorrectStructure({
				from: 'from',
				to: [],
				payload: {
					version: '1.0',
				},
			} as any),
		).toThrow(
			`Message should have 'payload' property that has 'type'(string) and 'version'(string) defined`,
		);

		expect(() =>
			checkMessageHasCorrectStructure({
				from: 'from',
				to: [],
				payload: {
					type: 'foo',
				},
			} as any),
		).toThrow(
			`Message should have 'payload' property that has 'type'(string) and 'version'(string) defined`,
		);
	});
});
