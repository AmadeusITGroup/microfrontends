import { Endpoint, EndpointType } from './endpoint';
import type { HandshakeMessage, RoutedMessage } from './message';

const createEndpoint = (id: string): EndpointType<any> => new Endpoint(id);

describe('Endpoint', () => {
	test(`should be created with correct state`, () => {
		const endpoint = createEndpoint('one');
		expect(endpoint.id).toBe('one');
		expect(endpoint.remoteId).toBeNull();
		expect(endpoint.connected).toBe(false);
	});

	test(`listen() should register window message event listener`, () => {
		const endpoint = createEndpoint('one');

		const calls: string[] = [];

		jest.spyOn(window, 'addEventListener').mockImplementation((type: string) => {
			if (type === 'message') {
				calls.push(type);
			}
		});

		expect(endpoint.remoteId).toBeNull();
		expect(endpoint.connected).toBe(false);
		expect(calls).toEqual([]);

		endpoint.listen('two', {
			knownPeers: new Map(),
			onMessage: jest.fn(),
			onError: jest.fn(),
		});

		expect(endpoint.remoteId).toBe('two');
		expect(endpoint.connected).toBe(false);
		expect(calls).toEqual(['message']);
	});

	test(`connect() should send handshake`, () => {
		const endpoint = createEndpoint('one');

		// spying on window postMessage
		const messages: any[] = [];
		jest.spyOn(window, 'dispatchEvent').mockImplementation((event: Event) => {
			messages.push((event as any).detail);
			return true;
		});

		const knownPeers = new Map([['new', [{ type: 'test', version: '1.0' }]]]);

		// 1. connecting to 'two'
		endpoint.connect('two', {
			knownPeers,
			onMessage: jest.fn(),
			onError: jest.fn(),
		});

		// 2. checking the handshake was sent
		expect(messages.length).toBe(1);
		const { data, origin } = messages[0];
		expect(data).toEqual({
			from: 'one',
			to: ['two'],
			payload: {
				endpointId: 'two',
				knownPeers,
				remoteId: 'one',
				type: 'handshake',
				version: '1.0',
			},
		});

		expect(origin).toBe('https://test.com');
	});
	//
	test(`listen() should handle handshake and send it back`, () => {
		const endpoint = createEndpoint('one');

		// spying on window handshake listener
		let listener: any;
		jest
			.spyOn(window, 'addEventListener')
			.mockImplementation((type: string, handshakeListener: any) => (listener = handshakeListener));

		// spying on port.postMessage
		const messages: any[] = [];
		const postMessage = (message: any) => messages.push(message);

		const knownPeers = new Map([['new', [{ type: 'test', version: '1.0' }]]]);

		// 1. listening for 'two'
		endpoint.listen('two', {
			knownPeers,
			onMessage: jest.fn(),
			onError: jest.fn(),
		});

		// 2. sending handshake from 'two' to 'one'
		listener({
			origin: 'https://test.com',
			ports: [
				{
					onmessage: jest.fn(),
					postMessage,
				},
			],
			source: 'b',
			data: {
				payload: {
					type: 'handshake',
					version: '1.0',
					endpointId: 'one',
					remoteId: 'two',
					knownPeers: new Map(),
				},
			},
		});

		// 3. checking the handshake was sent back
		expect(messages.length).toBe(1);
		const message = messages[0];
		expect(message).toEqual({
			from: 'one',
			to: ['two'],
			payload: {
				type: 'handshake',
				version: '1.0',
				endpointId: 'two',
				remoteId: 'one',
				knownPeers,
			},
		} satisfies RoutedMessage<HandshakeMessage>);
	});
});
