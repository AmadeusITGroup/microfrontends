import { LocalMessageChannel } from './local-message-channel';

describe('LocalMessageChannel', () => {
	test(`should send messages`, () => {
		const mc = new LocalMessageChannel();

		const messages1: any[] = [];
		const messages2: any[] = [];
		mc.port1.onmessage = (event) => messages1.push(event);
		mc.port2.onmessage = (event) => messages2.push(event);

		const set = new Set('World');

		mc.port1.postMessage('Hello');
		mc.port2.postMessage(set);

		expect(messages1).toHaveLength(1);
		expect(messages2).toHaveLength(1);
		expect(messages2[0].data).toBe('Hello');

		// set should be equal, but not passed by reference
		const receivedSet = messages1[0].data;
		expect(receivedSet).toEqual(set);
		expect(receivedSet).not.toBe(set);
	});
});
