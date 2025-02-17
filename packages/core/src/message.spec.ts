import { isServiceMessage, SERVICE_MESSAGE_TYPES } from './message';

describe('isServiceMessage', () => {
	test(`should cover all message types from 'ServiceMessage`, () => {
		const messageTypes = Object.keys(SERVICE_MESSAGE_TYPES);
		for (const type of messageTypes) {
			expect(isServiceMessage({ type, version: '1.0' })).toBe(true);
		}
	});

	test(`should return 'false' for bad messages`, () => {
		expect(isServiceMessage({ type: 'bad', version: '1.0' })).toBe(false);
		expect(isServiceMessage({ type: '', version: '1.0' })).toBe(false);
		expect(isServiceMessage('' as any)).toBe(false);
		expect(isServiceMessage(null as any)).toBe(false);
		expect(isServiceMessage({} as any)).toBe(false);
	});
});
