import type { MessagePeerType, PeerOptions } from './peer';
import { MessagePeer } from './peer';
import { MessageError } from './message-error';
import type { Message, RoutedMessage, ServiceMessage } from './message';
import { from } from 'rxjs';

/**
 * Mocking window event listeners to establish connection via custom events
 */
const handshakeListeners = new Set<any>();
window.addEventListener = jest.fn().mockImplementation((type: string, handshakeListener: any) => {
	if (type === 'handshake') {
		handshakeListeners.add(handshakeListener);
	}
});

window.removeEventListener = jest
	.fn()
	.mockImplementation((type: string, handshakeListener: any) => {
		if (type === 'handshake') {
			handshakeListeners.delete(handshakeListener);
		}
	});

window.dispatchEvent = jest.fn().mockImplementation((event: any) => {
	for (const listener of handshakeListeners) {
		listener(event);
	}
});

function expectMessages(onMessageMock: any, messages: any[]) {
	expect(onMessageMock.mock.calls.length).toBe(messages.length);
	for (let i = 0; i < messages.length; i++) {
		expect(onMessageMock.mock.calls[i][0]).toEqual(messages[i]);
	}
}

function expectErrors(onErrorMock: any, errors: any[]) {
	expect(onErrorMock.mock.calls.length).toBe(errors.length);
	for (let i = 0; i < errors.length; i++) {
		expect(onErrorMock.mock.calls[i][0]).toEqual(errors[i]);
	}
}

describe('Peer', () => {
	let onMessage: any;
	let onError: any;
	const knownMessages = [{ type: 'known', version: '1.0' }];

	const DEFAULT_OPTIONS: Omit<PeerOptions, 'id'> = { knownMessages };

	function createPeer(id: string, options?: Omit<PeerOptions, 'id'>): MessagePeerType<any> {
		const peer = new MessagePeer({ id, ...DEFAULT_OPTIONS, ...options });

		peer.messages.subscribe((message) => onMessage({ [id]: message }));
		peer.serviceMessages.subscribe((message) => onMessage({ [id]: message }));
		peer.errors.subscribe((error) => onError({ [id]: error }));

		return peer;
	}

	beforeEach(() => {
		onMessage = jest.fn();
		onError = jest.fn();
	});

	afterEach(() => {
		handshakeListeners.clear();
	});

	test(`should be created with reasonable defaults`, () => {
		const peer = new MessagePeer({ id: 'one' });
		expect(peer.id).toBe('one');
		expect(peer.knownPeers).toEqual(new Map([['one', []]]));
	});

	test('connect()/listen() should check provided origin', () => {
		const peer = new MessagePeer({ id: 'one' });

		// should throw because of the trailing slash
		expect(() => {
			peer.listen('two', {
				origin: 'https://test.com/',
			});
		}).toThrow();
		expect(() => {
			peer.connect('two', {
				origin: 'https://test.com/',
			});
		}).toThrow();
	});

	test(`connect() should connect to another peer`, () => {
		const one = new MessagePeer({ id: 'one' });
		const two = new MessagePeer({ id: 'two' });

		// 1-2
		one.listen('two');
		two.connect('one');

		expect(one.knownPeers).toEqual(
			new Map([
				['one', []],
				['two', []],
			]),
		);
		expect(two.knownPeers).toEqual(
			new Map([
				['one', []],
				['two', []],
			]),
		);
	});

	test(`send() should exchange simple messages`, () => {
		const one = createPeer('one');
		const two = createPeer('two');

		one.listen('two');
		two.connect('one');
		one.send({ type: 'known', version: '1.0' });
		two.send({ type: 'known', version: '1.0' });

		expectMessages(onMessage, [
			{
				one: {
					from: 'two',
					to: ['one'],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['two'] },
				},
			},
			{
				two: {
					from: 'one',
					to: ['two'],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['one'] },
				},
			},
			{ two: { from: 'one', to: [], payload: { type: 'known', version: '1.0' } } },
			{ one: { from: 'two', to: [], payload: { type: 'known', version: '1.0' } } },
		]);

		expectErrors(onError, []);
	});

	test(`send() should queue messages sent before connection establishing`, () => {
		const one = createPeer('one');
		const two = createPeer('two');
		const three = createPeer('three');

		// cache messages
		one.send({ type: 'known', version: '1.0' });
		three.send({ type: 'known', version: '1.0' });

		// 1-2, 1-3
		one.listen('two');
		one.listen('three');
		two.connect('one');
		// 1:(connect-2), 2:(connect-1), 2:(known-1)
		three.connect('one');
		// 2:(connect-3), 1:(connect-3), 1:(known-3), 2:(known-3),
		// 3:connect(1,2), 3:(known-1)

		expectMessages(onMessage, [
			{
				one: {
					from: 'two',
					to: ['one'],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['two'] },
				},
			},
			{
				two: {
					from: 'one',
					to: ['two'],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['one'] },
				},
			},
			{
				two: {
					from: 'one',
					to: [],
					payload: { type: 'known', version: '1.0' },
				},
			},
			{
				two: {
					from: 'one',
					to: [],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['three'] },
				},
			},
			{
				one: {
					from: 'three',
					to: ['one'],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['three'] },
				},
			},
			{
				one: {
					from: 'three',
					to: [],
					payload: { type: 'known', version: '1.0' },
				},
			},
			{
				two: {
					from: 'three',
					to: [],
					payload: { type: 'known', version: '1.0' },
				},
			},
			{
				three: {
					from: 'one',
					to: ['three'],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['one', 'two'] },
				},
			},
			{
				three: {
					from: 'one',
					to: [],
					payload: { type: 'known', version: '1.0' },
				},
			},
		]);

		expectErrors(onError, []);
	});

	test(`send() should fail when exchanging unknown messages`, () => {
		const one = createPeer('one', { messageCheckStrategy: 'version' });
		const two = createPeer('two', { messageCheckStrategy: 'version' });

		// 1-2
		one.listen('two');
		two.connect('one');
		one.send({ type: 'unknown', version: '1.0' });
		two.send({ type: 'known', version: '2.0' });

		expectMessages(onMessage, [
			{
				one: {
					from: 'two',
					to: ['one'],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['two'] },
				},
			},
			{
				two: {
					from: 'one',
					to: ['two'],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['one'] },
				},
			},
			{
				one: {
					from: 'two',
					to: ['one'],
					payload: {
						type: 'error',
						version: '1.0',
						error: `Unknown message type "unknown". Known types: ["known"]`,
						message: {
							from: 'one',
							to: [],
							payload: { type: 'unknown', version: '1.0' },
						},
					},
				},
			},
			{
				two: {
					from: 'one',
					to: ['two'],
					payload: {
						type: 'error',
						version: '1.0',
						error: `Unknown message version "2.0". Known versions: ["1.0"]`,
						message: {
							from: 'two',
							to: [],
							payload: { type: 'known', version: '2.0' },
						},
					},
				},
			},
		]);

		expectErrors(onError, [
			{
				two: new MessageError(
					{ from: 'one', to: [], payload: { type: 'unknown', version: '1.0' } },
					`Unknown message type "unknown". Known types: ["known"]`,
				),
			},
			{
				one: new MessageError(
					{ from: 'two', to: [], payload: { type: 'known', version: '2.0' } },
					`Unknown message version "2.0". Known versions: ["1.0"]`,
				),
			},
		]);
	});

	test(`send() should broadcast messages`, () => {
		const one = createPeer('one');
		const two = createPeer('two');
		const three = createPeer('three');

		// 1-2, 1-3
		one.listen('two');
		one.listen('three');
		two.connect('one');
		three.connect('one');
		one.send({ type: 'known', version: '1.0' });

		expectMessages(onMessage, [
			{
				one: {
					from: 'two',
					to: ['one'],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['two'] },
				},
			},
			{
				two: {
					from: 'one',
					to: ['two'],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['one'] },
				},
			},
			{
				two: {
					from: 'one',
					to: [],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['three'] },
				},
			},
			{
				one: {
					from: 'three',
					to: ['one'],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['three'] },
				},
			},
			{
				three: {
					from: 'one',
					to: ['three'],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['one', 'two'] },
				},
			},
			{ two: { from: 'one', to: [], payload: { type: 'known', version: '1.0' } } },
			{ three: { from: 'one', to: [], payload: { type: 'known', version: '1.0' } } },
		]);
		expectErrors(onError, []);
	});

	test(`send() send direct messages`, () => {
		const one = createPeer('one');
		const two = createPeer('two');
		const three = createPeer('three');

		// 1-2, 1-3
		one.listen('two');
		one.listen('three');
		two.connect('one');
		three.connect('one');
		one.send({ type: 'known', version: '1.0' }, { to: ['three'] });

		expectMessages(onMessage, [
			{
				one: {
					from: 'two',
					to: ['one'],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['two'] },
				},
			},
			{
				two: {
					from: 'one',
					to: ['two'],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['one'] },
				},
			},
			{
				two: {
					from: 'one',
					to: [],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['three'] },
				},
			},
			{
				one: {
					from: 'three',
					to: ['one'],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['three'] },
				},
			},
			{
				three: {
					from: 'one',
					to: ['three'],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['one', 'two'] },
				},
			},
			{ three: { from: 'one', to: ['three'], payload: { type: 'known', version: '1.0' } } },
		]);
		expectErrors(onError, []);
	});

	test(`should propagate 'knownMessages' when adding new peers`, () => {
		const one = createPeer('one');
		const two = createPeer('two');
		const three = createPeer('three', {
			knownMessages: [{ type: 'three-only', version: '1.0' }],
		});

		// 1-2, 2-*
		one.listen('two');
		two.connect('one');
		two.listen('three');
		expect(one.knownPeers).toEqual(
			new Map([
				['one', knownMessages],
				['two', knownMessages],
			]),
		);
		expect(two.knownPeers).toEqual(
			new Map([
				['one', knownMessages],
				['two', knownMessages],
			]),
		);
		expect(three.knownPeers).toEqual(
			new Map([['three', [{ type: 'three-only', version: '1.0' }]]]),
		);

		// 1-2, 2-3
		three.connect('two');
		expect(one.knownPeers).toEqual(
			new Map([
				['one', knownMessages],
				['two', knownMessages],
				[
					'three',
					[
						{
							type: 'three-only',
							version: '1.0',
						},
					],
				],
			]),
		);
		expect(two.knownPeers).toEqual(
			new Map([
				['one', knownMessages],
				['two', knownMessages],
				[
					'three',
					[
						{
							type: 'three-only',
							version: '1.0',
						},
					],
				],
			]),
		);
		expect(three.knownPeers).toEqual(
			new Map([
				['one', knownMessages],
				['two', knownMessages],
				[
					'three',
					[
						{
							type: 'three-only',
							version: '1.0',
						},
					],
				],
			]),
		);

		expectMessages(onMessage, [
			{
				one: {
					from: 'two',
					to: ['one'],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['two'] },
				},
			},
			{
				two: {
					from: 'one',
					to: ['two'],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['one'] },
				},
			},
			{
				one: {
					from: 'two',
					to: [],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['three'] },
				},
			},
			{
				two: {
					from: 'three',
					to: ['two'],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['three'] },
				},
			},
			{
				three: {
					from: 'two',
					to: ['three'],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['two', 'one'] },
				},
			},
		]);
		expectErrors(onError, []);
	});

	test(`should forward unknown messages`, () => {
		const one = createPeer('one');
		const two = createPeer('two', { messageCheckStrategy: 'type' });
		const three = createPeer('three', {
			knownMessages: [{ type: 'three-only', version: '1.0' }],
		});

		// 1-2, 2-3
		one.listen('two');
		two.listen('three');
		two.connect('one');
		three.connect('two');
		one.send({ type: 'three-only', version: '1.0' }, { to: 'three' });
		one.send({ type: 'three-only', version: '1.0' }, { to: ['three'] });
		one.send({ type: 'three-only', version: '1.0' });

		expectMessages(onMessage, [
			{
				one: {
					from: 'two',
					to: ['one'],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['two'] },
				},
			},
			{
				two: {
					from: 'one',
					to: ['two'],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['one'] },
				},
			},
			{
				one: {
					from: 'two',
					to: [],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['three'] },
				},
			},
			{
				two: {
					from: 'three',
					to: ['two'],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['three'] },
				},
			},
			{
				three: {
					from: 'two',
					to: ['three'],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['two', 'one'] },
				},
			},
			{ three: { from: 'one', to: ['three'], payload: { type: 'three-only', version: '1.0' } } },
			{ three: { from: 'one', to: ['three'], payload: { type: 'three-only', version: '1.0' } } },
			{
				one: {
					from: 'two',
					to: ['one'],
					payload: {
						type: 'error',
						version: '1.0',
						error: `Unknown message type "three-only". Known types: ["known"]`,
						message: {
							from: 'one',
							to: [],
							payload: { type: 'three-only', version: '1.0' },
						},
					},
				},
			},
			{ three: { from: 'one', to: [], payload: { type: 'three-only', version: '1.0' } } },
		]);
		expectErrors(onError, [
			{
				two: new MessageError(
					{ from: 'one', to: [], payload: { type: 'three-only', version: '1.0' } },
					`Unknown message type "three-only". Known types: ["known"]`,
				),
			},
		]);
	});

	test(`should handle disconnect / reconnect`, () => {
		const one = createPeer('one');
		const two = createPeer('two');
		const three = createPeer('three');
		const four = createPeer('four');

		// 1-2, 2-3, 3-4
		one.listen('two');
		two.listen('three');
		three.listen('four');
		three.connect('two');
		two.connect('one');
		four.connect('three');

		for (const peer of [one, two, three, four]) {
			expect(peer.knownPeers).toEqual(
				new Map([
					['one', knownMessages],
					['two', knownMessages],
					['three', knownMessages],
					['four', knownMessages],
				]),
			);
		}

		// disconnect 2-3
		three.disconnect('two');
		expect(one.knownPeers).toEqual(
			new Map([
				['one', knownMessages],
				['two', knownMessages],
			]),
		);
		expect(two.knownPeers).toEqual(
			new Map([
				['one', knownMessages],
				['two', knownMessages],
			]),
		);
		expect(three.knownPeers).toEqual(
			new Map([
				['three', knownMessages],
				['four', knownMessages],
			]),
		);
		expect(four.knownPeers).toEqual(
			new Map([
				['four', knownMessages],
				['three', knownMessages],
			]),
		);

		// reconnect 2-3
		two.listen('three');
		three.connect('two');
		for (const peer of [one, two, three, four]) {
			expect(peer.knownPeers).toEqual(
				new Map([
					['one', knownMessages],
					['two', knownMessages],
					['three', knownMessages],
					['four', knownMessages],
				]),
			);
		}

		// disconnect all from 2
		two.disconnect();
		expect(one.knownPeers).toEqual(new Map([['one', knownMessages]]));
		expect(two.knownPeers).toEqual(new Map([['two', knownMessages]]));
		expect(three.knownPeers).toEqual(
			new Map([
				['three', knownMessages],
				['four', knownMessages],
			]),
		);
		expect(four.knownPeers).toEqual(
			new Map([
				['four', knownMessages],
				['three', knownMessages],
			]),
		);

		expectMessages(onMessage, [
			// connect 1-2-3-4
			// 2-3
			{
				two: {
					from: 'three',
					to: ['two'],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['three'] },
				},
			},
			{
				three: {
					from: 'two',
					to: ['three'],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['two'] },
				},
			},
			// 1-2
			{
				three: {
					from: 'two',
					to: [],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['one'] },
				},
			},
			{
				one: {
					from: 'two',
					to: ['one'],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['two', 'three'] },
				},
			},
			{
				two: {
					from: 'one',
					to: ['two'],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['one'] },
				},
			},
			// 3-4
			{
				two: {
					from: 'three',
					to: [],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['four'] },
				},
			},
			{
				one: {
					from: 'three',
					to: [],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['four'] },
				},
			},
			{
				three: {
					from: 'four',
					to: ['three'],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['four'] },
				},
			},
			{
				four: {
					from: 'three',
					to: ['four'],
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: [],
						connected: ['three', 'two', 'one'],
					},
				},
			},

			// 3.disconnect(2): 1-2-x-3-4
			{
				two: {
					from: 'three',
					to: [],
					payload: {
						type: 'disconnect',
						version: '1.0',
						disconnected: 'three',
						unreachable: ['three', 'four'],
					},
				},
			},
			{
				one: {
					from: 'three',
					to: [],
					payload: {
						type: 'disconnect',
						version: '1.0',
						disconnected: 'three',
						unreachable: ['three', 'four'],
					},
				},
			},
			{
				four: {
					from: 'three',
					to: [],
					payload: {
						type: 'disconnect',
						version: '1.0',
						disconnected: 'two',
						unreachable: ['two', 'one'],
					},
				},
			},

			// reconnect 2-3
			{
				one: {
					from: 'two',
					to: [],
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: [],
						connected: ['three', 'four'],
					},
				},
			},
			{
				four: {
					from: 'three',
					to: [],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['two', 'one'] },
				},
			},
			{
				two: {
					from: 'three',
					to: ['two'],
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: [],
						connected: ['three', 'four'],
					},
				},
			},
			{
				three: {
					from: 'two',
					to: ['three'],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['two', 'one'] },
				},
			},
			//
			// 2.disconnect()
			// 1-2 disconnect: 1-x-2-3-4
			{
				one: {
					from: 'two',
					to: [],
					payload: {
						type: 'disconnect',
						version: '1.0',
						disconnected: 'two',
						unreachable: ['two', 'three', 'four'],
					},
				},
			},
			{
				three: {
					from: 'two',
					to: [],
					payload: {
						type: 'disconnect',
						version: '1.0',
						disconnected: 'one',
						unreachable: ['one'],
					},
				},
			},
			{
				four: {
					from: 'two',
					to: [],
					payload: {
						type: 'disconnect',
						version: '1.0',
						disconnected: 'one',
						unreachable: ['one'],
					},
				},
			},
			// 2-3 disconnect: 1-x-2-x-3-4
			{
				three: {
					from: 'two',
					to: [],
					payload: {
						type: 'disconnect',
						version: '1.0',
						disconnected: 'two',
						unreachable: ['two'],
					},
				},
			},
			{
				four: {
					from: 'two',
					to: [],
					payload: {
						type: 'disconnect',
						version: '1.0',
						disconnected: 'two',
						unreachable: ['two'],
					},
				},
			},
		]);
	});

	test(`should register new messages`, () => {
		const one = createPeer('one', { knownMessages: [] });
		const two = createPeer('two', { knownMessages: [] });

		// 1-2
		one.listen('two');
		two.connect('one');

		expect(one.knownPeers).toEqual(
			new Map([
				['one', []],
				['two', []],
			]),
		);
		expect(two.knownPeers).toEqual(
			new Map([
				['one', []],
				['two', []],
			]),
		);

		one.registerMessage({ type: 'new', version: '1.0' });
		one.registerMessage({ type: 'new', version: '1.0' }); // duplicate
		one.registerMessage({ type: 'new', version: '2.0' });

		expect(one.knownPeers).toEqual(
			new Map([
				[
					'one',
					[
						{ type: 'new', version: '1.0' },
						{
							type: 'new',
							version: '2.0',
						},
					],
				],
				['two', []],
			]),
		);
		expect(two.knownPeers).toEqual(
			new Map([
				['one', []],
				['two', []],
			]),
		);
	});

	test(`should register message and send declaration`, () => {
		const one = createPeer('one', { knownMessages: [] });
		const two = createPeer('two', { knownMessages: [] });
		const three = createPeer('three');

		// 1-2, 2-3
		one.listen('two');
		two.listen('three');
		two.connect('one');
		three.connect('two');

		for (const peer of [one, two, three]) {
			expect(peer.knownPeers).toEqual(
				new Map([
					['one', []],
					['two', []],
					['three', knownMessages],
				]),
			);
		}

		one.registerMessage({ type: 'new', version: '1.0' });
		one.send({
			type: 'declare_messages',
			version: '1.0',
			messages: [{ type: 'new', version: '1.0' }],
		});

		for (const peer of [one, two, three]) {
			expect(peer.knownPeers).toEqual(
				new Map([
					[
						'one',
						[
							{
								type: 'new',
								version: '1.0',
							},
						],
					],
					['two', []],
					['three', knownMessages],
				]),
			);
		}

		expectMessages(onMessage, [
			{
				one: {
					from: 'two',
					to: ['one'],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['two'] },
				},
			},
			{
				two: {
					from: 'one',
					to: ['two'],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['one'] },
				},
			},
			{
				one: {
					from: 'two',
					to: [],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['three'] },
				},
			},
			{
				two: {
					from: 'three',
					to: ['two'],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['three'] },
				},
			},
			{
				three: {
					from: 'two',
					to: ['three'],
					payload: { type: 'connect', version: '1.0', knownPeers: [], connected: ['two', 'one'] },
				},
			},
			{
				two: {
					from: 'one',
					to: [],
					payload: {
						type: 'declare_messages',
						version: '1.0',
						messages: [{ type: 'new', version: '1.0' }],
					},
				},
			},
			{
				three: {
					from: 'one',
					to: [],
					payload: {
						type: 'declare_messages',
						version: '1.0',
						messages: [{ type: 'new', version: '1.0' }],
					},
				},
			},
		]);
		expectErrors(onError, []);
	});

	test(`should separate user messages and service messages`, () => {
		const onMessage = jest.fn();
		const onServiceMessage = jest.fn();

		const one = new MessagePeer<Message | ServiceMessage>({ id: 'one', knownMessages });
		const two = new MessagePeer<Message | ServiceMessage>({
			id: 'two',
			knownMessages,
		});

		two.messages.subscribe(({ payload }: RoutedMessage<Message>) =>
			onMessage({ type: payload.type, version: payload.version }),
		);
		two.serviceMessages.subscribe(({ payload }: RoutedMessage<ServiceMessage>) =>
			onServiceMessage({ type: payload.type, version: payload.version }),
		);

		// initial connect
		one.listen('two');
		two.connect('one');

		expect(onMessage.mock.calls.length).toBe(0);
		expect(onServiceMessage.mock.calls.length).toBe(1); // initial connect message

		// normal message
		one.send({ type: 'known', version: '1.0' });

		// declare messages
		one.send({
			type: 'declare_messages',
			version: '1.0',
			messages: [],
		});

		// disconnect message
		one.disconnect('two');

		expect(onMessage.mock.calls).toEqual([[{ type: 'known', version: '1.0' }]]);
		expect(onServiceMessage.mock.calls).toEqual([
			[{ type: 'connect', version: '1.0' }],
			[{ type: 'declare_messages', version: '1.0' }],
			[{ type: 'disconnect', version: '1.0' }],
		]);
	});

	test(`'.messages' should receive simple messages`, () => {
		const one = createPeer('one');
		const two = createPeer('two');

		const oneMessages: any[] = [];
		const twoMessages: any[] = [];
		one.messages.subscribe((message) => oneMessages.push(message.payload));
		two.messages.subscribe((message) => twoMessages.push(message.payload));

		one.listen('two');
		two.connect('one');

		one.send({ type: 'known', version: '1.0' });
		two.send({ type: 'known', version: '1.0' });

		expect(oneMessages).toEqual([{ type: 'known', version: '1.0' }]);
		expect(twoMessages).toEqual([{ type: 'known', version: '1.0' }]);
	});

	test(`'.serviceMessages' should receive simple service messages`, () => {
		const one = createPeer('one');
		const two = createPeer('two');

		const oneMessages: any[] = [];
		const twoMessages: any[] = [];
		one.serviceMessages.subscribe((message) => oneMessages.push(message.payload));
		two.serviceMessages.subscribe((message) => twoMessages.push(message.payload));

		one.listen('two');
		two.connect('one');

		expect(oneMessages).toEqual([
			{ type: 'connect', version: '1.0', connected: ['two'], knownPeers: [] },
		]);
		expect(twoMessages).toEqual([
			{ type: 'connect', version: '1.0', connected: ['one'], knownPeers: [] },
		]);
	});

	test(`'.errors' should receive error messages`, () => {
		const one = createPeer('one', { messageCheckStrategy: 'version' });
		const two = createPeer('two');

		const oneMessages: any[] = [];
		one.errors.subscribe(({ message }) => oneMessages.push(message));

		one.listen('two');
		two.connect('one');

		two.send({ type: 'known', version: '2.0' });
		expect(oneMessages).toEqual(['Unknown message version "2.0". Known versions: ["1.0"]']);
	});

	test(`'.messages' should interop with 'rxjs' 'from()'`, () => {
		const one = createPeer('one');
		const two = createPeer('two');

		const messages: any[] = [];
		const subscription = from(one.messages).subscribe({
			next: (message) => messages.push(message.payload),
		});

		expect(messages).toEqual([]);

		one.listen('two');
		two.connect('one');

		two.send({ type: 'known', version: '1.0' });
		expect(messages).toEqual([{ type: 'known', version: '1.0' }]);

		subscription.unsubscribe();

		two.send({ type: 'known', version: '1.0' });
		expect(messages).toEqual([{ type: 'known', version: '1.0' }]);
	});

	test(`should respect 'default' message check strategy`, () => {
		const one = new MessagePeer({ id: 'one' });
		const two = new MessagePeer({ id: 'two' });

		const messages: any[] = [];
		const errors: any[] = [];
		two.messages.subscribe((message) => messages.push(message.payload));
		two.errors.subscribe(({ message }) => errors.push(message));

		// 1-2
		one.listen('two');
		two.connect('one');

		one.send({ type: 'known', version: '1.0' });
		one.send({ type: 'known', version: '2.0' });
		one.send({ type: 'unknown', version: '1.0' });
		one.send({ version: 'malformed' } as any);

		expect(messages).toEqual([
			{ type: 'known', version: '1.0' },
			{ type: 'known', version: '2.0' },
			{ type: 'unknown', version: '1.0' },
		]);

		expect(errors).toEqual([
			`Message should have 'payload' property that has 'type'(string) defined`,
		]);
	});

	test(`should respect 'type' message check strategy`, () => {
		const one = new MessagePeer({ id: 'one' });
		const two = new MessagePeer({ id: 'two', messageCheckStrategy: 'type', knownMessages });

		const messages: any[] = [];
		const errors: any[] = [];
		two.messages.subscribe((message) => messages.push(message.payload));
		two.errors.subscribe(({ message }) => errors.push(message));

		// 1-2
		one.listen('two');
		two.connect('one');

		one.send({ type: 'known', version: '1.0' });
		one.send({ type: 'known', version: '2.0' });
		one.send({ type: 'unknown', version: '1.0' });
		one.send({ type: 'known' });

		expect(messages).toEqual([
			{ type: 'known', version: '1.0' },
			{ type: 'known', version: '2.0' },
			{ type: 'known' },
		]);

		expect(errors).toEqual([`Unknown message type "unknown". Known types: ["known"]`]);
	});

	test(`should respect 'version' message check strategy`, () => {
		const one = new MessagePeer({ id: 'one' });
		const two = new MessagePeer({ id: 'two', messageCheckStrategy: 'version', knownMessages });

		const messages: any[] = [];
		const errors: any[] = [];
		two.messages.subscribe((message) => messages.push(message.payload));
		two.errors.subscribe(({ message }) => errors.push(message));

		// 1-2
		one.listen('two');
		two.connect('one');

		one.send({ type: 'known', version: '1.0' });
		one.send({ type: 'known', version: '2.0' });
		one.send({ type: 'unknown', version: '1.0' });
		one.send({ type: 'malformed' });

		expect(messages).toEqual([{ type: 'known', version: '1.0' }]);

		expect(errors).toEqual([
			`Unknown message version "2.0". Known versions: ["1.0"]`,
			`Unknown message type "unknown". Known types: ["known"]`,
			`Message should have 'payload' property that has 'version'(string) defined`,
		]);
	});
});
