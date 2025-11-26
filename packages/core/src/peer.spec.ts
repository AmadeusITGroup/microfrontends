import type { MessagePeerType, PeerOptions } from './peer';
import { GLOBAL_HANDSHAKE_HANDLER } from './handlers';
import { MessagePeer } from './peer';
import { MessageError } from './message-error';
import type { Message, RoutedMessage, ServiceMessage } from './message';
import { from } from 'rxjs';
import { vi } from 'vitest';

window.dispatchEvent = vi.fn().mockImplementation((event: any) => {
	GLOBAL_HANDSHAKE_HANDLER(event);
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

	function clearMessages() {
		onMessage.mockClear();
	}

	function createSimpleChain() {
		const one = createPeer('one');
		const two = createPeer('two');

		// 1-2
		one.listen('two');
		two.connect('one');

		return [one, two];
	}

	function createPeerChain() {
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

		return [one, two, three, four];
	}

	function createPeerTree() {
		const one = createPeer('one');
		const two = createPeer('two');
		const three = createPeer('three');

		// 1-2, 1-3
		one.listen(['two', 'three']);
		two.connect('one');
		three.connect('one');

		return [one, two, three];
	}

	function createComplexTree() {
		const one = createPeer('one');
		const two = createPeer('two');
		const three = createPeer('three');
		const four = createPeer('four');
		const five = createPeer('five');
		const six = createPeer('six');

		// 2-4
		two.listen(['three', 'four']);
		four.connect('two');

		// 2-3
		three.connect('two');

		// 1-5
		one.listen(['five', 'two']);
		five.connect('one');

		// 5-6
		five.listen('six');
		six.connect('five');

		// 1-2
		two.connect('one');

		return [one, two, three, four, five, six];
	}

	beforeEach(() => {
		onMessage = vi.fn();
		onError = vi.fn();
	});

	describe('test use cases', () => {
		test(`should create 1-2 chain`, () => {
			const [one, two] = createSimpleChain();

			for (const peer of [one, two]) {
				expect(peer.knownPeers).toEqual(
					new Map([
						['one', knownMessages],
						['two', knownMessages],
					]),
				);
			}

			expect(one.peerConnections).toEqual(new Map([['two', new Set(['two'])]]));
			expect(two.peerConnections).toEqual(new Map([['one', new Set(['one'])]]));

			expectMessages(onMessage, [
				{
					one: {
						from: 'two',
						to: ['one'],
						payload: {
							type: 'handshake',
							endpointId: 'one',
							remoteId: 'two',
							version: '1.0',
							knownPeers: new Map([['two', [{ type: 'known', version: '1.0' }]]]),
						},
					},
				},
				{
					two: {
						from: 'one',
						to: ['two'],
						payload: {
							type: 'handshake',
							endpointId: 'two',
							remoteId: 'one',
							version: '1.0',
							knownPeers: new Map([['one', [{ type: 'known', version: '1.0' }]]]),
						},
					},
				},
				{
					one: {
						from: 'two',
						to: ['one'],
						payload: {
							type: 'connect',
							version: '1.0',
							knownPeers: new Map([['two', [{ type: 'known', version: '1.0' }]]]),
							connected: ['two'],
						},
					},
				},
				{
					two: {
						from: 'one',
						to: ['two'],
						payload: {
							type: 'connect',
							version: '1.0',
							knownPeers: new Map([['one', [{ type: 'known', version: '1.0' }]]]),
							connected: ['one'],
						},
					},
				},
			]);
		});

		test(`should create 1-2 1-3 tree`, () => {
			const [one, two, three] = createPeerTree();

			for (const peer of [one, two, three]) {
				expect(peer.knownPeers).toEqual(
					new Map([
						['one', knownMessages],
						['two', knownMessages],
						['three', knownMessages],
					]),
				);
			}

			expect(one.peerConnections).toEqual(
				new Map([
					['two', new Set(['two'])],
					['three', new Set(['three'])],
				]),
			);
			expect(two.peerConnections).toEqual(new Map([['one', new Set(['one', 'three'])]]));
			expect(three.peerConnections).toEqual(new Map([['one', new Set(['one', 'two'])]]));

			expectMessages(onMessage, [
				{
					one: {
						from: 'two',
						to: ['one'],
						payload: {
							type: 'handshake',
							endpointId: 'one',
							remoteId: 'two',
							version: '1.0',
							knownPeers: new Map([['two', [{ type: 'known', version: '1.0' }]]]),
						},
					},
				},
				{
					two: {
						from: 'one',
						to: ['two'],
						payload: {
							type: 'handshake',
							endpointId: 'two',
							remoteId: 'one',
							version: '1.0',
							knownPeers: new Map([['one', [{ type: 'known', version: '1.0' }]]]),
						},
					},
				},
				{
					one: {
						from: 'two',
						to: ['one'],
						payload: {
							type: 'connect',
							version: '1.0',
							knownPeers: new Map([['two', [{ type: 'known', version: '1.0' }]]]),
							connected: ['two'],
						},
					},
				},
				{
					two: {
						from: 'one',
						to: ['two'],
						payload: {
							type: 'connect',
							version: '1.0',
							knownPeers: new Map([['one', [{ type: 'known', version: '1.0' }]]]),
							connected: ['one'],
						},
					},
				},
				{
					one: {
						from: 'three',
						to: ['one'],
						payload: {
							type: 'handshake',
							endpointId: 'one',
							remoteId: 'three',
							version: '1.0',
							knownPeers: new Map([['three', [{ type: 'known', version: '1.0' }]]]),
						},
					},
				},
				{
					two: {
						from: 'one',
						to: [],
						payload: {
							type: 'connect',
							version: '1.0',
							knownPeers: new Map([['three', [{ type: 'known', version: '1.0' }]]]),
							connected: ['three'],
						},
					},
				},
				{
					three: {
						from: 'one',
						to: ['three'],
						payload: {
							type: 'handshake',
							endpointId: 'three',
							remoteId: 'one',
							version: '1.0',
							knownPeers: new Map([
								['one', [{ type: 'known', version: '1.0' }]],
								['two', [{ type: 'known', version: '1.0' }]],
							]),
						},
					},
				},
				{
					one: {
						from: 'three',
						to: ['one'],
						payload: {
							type: 'connect',
							version: '1.0',
							knownPeers: new Map([['three', [{ type: 'known', version: '1.0' }]]]),
							connected: ['three'],
						},
					},
				},
				{
					three: {
						from: 'one',
						to: ['three'],
						payload: {
							type: 'connect',
							version: '1.0',
							knownPeers: new Map([
								['one', [{ type: 'known', version: '1.0' }]],
								['two', [{ type: 'known', version: '1.0' }]],
							]),
							connected: ['one', 'two'],
						},
					},
				},
			]);
		});

		test(`should create 1-2 2-3 3-4 chain`, () => {
			const [one, two, three, four] = createPeerChain();

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

			expect(one.peerConnections).toEqual(new Map([['two', new Set(['two', 'three', 'four'])]]));
			expect(two.peerConnections).toEqual(
				new Map([
					['one', new Set(['one'])],
					['three', new Set(['three', 'four'])],
				]),
			);
			expect(three.peerConnections).toEqual(
				new Map([
					['two', new Set(['one', 'two'])],
					['four', new Set(['four'])],
				]),
			);
			expect(four.peerConnections).toEqual(new Map([['three', new Set(['three', 'two', 'one'])]]));

			expectMessages(onMessage, [
				// 2-3
				{
					two: {
						from: 'three',
						to: ['two'],
						payload: {
							type: 'handshake',
							endpointId: 'two',
							remoteId: 'three',
							version: '1.0',
							knownPeers: new Map([['three', [{ type: 'known', version: '1.0' }]]]),
						},
					},
				},
				{
					three: {
						from: 'two',
						to: ['three'],
						payload: {
							type: 'handshake',
							endpointId: 'three',
							remoteId: 'two',
							version: '1.0',
							knownPeers: new Map([['two', [{ type: 'known', version: '1.0' }]]]),
						},
					},
				},
				{
					two: {
						from: 'three',
						to: ['two'],
						payload: {
							type: 'connect',
							version: '1.0',
							knownPeers: new Map([['three', [{ type: 'known', version: '1.0' }]]]),
							connected: ['three'],
						},
					},
				},
				{
					three: {
						from: 'two',
						to: ['three'],
						payload: {
							type: 'connect',
							version: '1.0',
							knownPeers: new Map([['two', [{ type: 'known', version: '1.0' }]]]),
							connected: ['two'],
						},
					},
				},
				// 1-2
				{
					one: {
						from: 'two',
						to: ['one'],
						payload: {
							type: 'handshake',
							endpointId: 'one',
							remoteId: 'two',
							version: '1.0',
							knownPeers: new Map([
								['two', [{ type: 'known', version: '1.0' }]],
								['three', [{ type: 'known', version: '1.0' }]],
							]),
						},
					},
				},
				{
					two: {
						from: 'one',
						to: ['two'],
						payload: {
							type: 'handshake',
							endpointId: 'two',
							remoteId: 'one',
							version: '1.0',
							knownPeers: new Map([['one', [{ type: 'known', version: '1.0' }]]]),
						},
					},
				},
				{
					three: {
						from: 'two',
						to: [],
						payload: {
							type: 'connect',
							version: '1.0',
							knownPeers: new Map([['one', [{ type: 'known', version: '1.0' }]]]),
							connected: ['one'],
						},
					},
				},
				{
					one: {
						from: 'two',
						to: ['one'],
						payload: {
							type: 'connect',
							version: '1.0',
							knownPeers: new Map([
								['two', [{ type: 'known', version: '1.0' }]],
								['three', [{ type: 'known', version: '1.0' }]],
							]),
							connected: ['two', 'three'],
						},
					},
				},
				{
					two: {
						from: 'one',
						to: ['two'],
						payload: {
							type: 'connect',
							version: '1.0',
							knownPeers: new Map([['one', [{ type: 'known', version: '1.0' }]]]),
							connected: ['one'],
						},
					},
				},
				// 3-4
				{
					three: {
						from: 'four',
						to: ['three'],
						payload: {
							type: 'handshake',
							endpointId: 'three',
							remoteId: 'four',
							version: '1.0',
							knownPeers: new Map([['four', [{ type: 'known', version: '1.0' }]]]),
						},
					},
				},
				{
					two: {
						from: 'three',
						to: [],
						payload: {
							type: 'connect',
							version: '1.0',
							knownPeers: new Map([['four', [{ type: 'known', version: '1.0' }]]]),
							connected: ['four'],
						},
					},
				},
				{
					one: {
						from: 'three',
						to: [],
						payload: {
							type: 'connect',
							version: '1.0',
							knownPeers: new Map([['four', [{ type: 'known', version: '1.0' }]]]),
							connected: ['four'],
						},
					},
				},
				{
					four: {
						from: 'three',
						to: ['four'],
						payload: {
							type: 'handshake',
							endpointId: 'four',
							remoteId: 'three',
							version: '1.0',
							knownPeers: new Map([
								['three', [{ type: 'known', version: '1.0' }]],
								['two', [{ type: 'known', version: '1.0' }]],
								['one', [{ type: 'known', version: '1.0' }]],
							]),
						},
					},
				},
				{
					three: {
						from: 'four',
						to: ['three'],
						payload: {
							type: 'connect',
							version: '1.0',
							knownPeers: new Map([['four', [{ type: 'known', version: '1.0' }]]]),
							connected: ['four'],
						},
					},
				},
				{
					four: {
						from: 'three',
						to: ['four'],
						payload: {
							type: 'connect',
							version: '1.0',
							knownPeers: new Map([
								['three', [{ type: 'known', version: '1.0' }]],
								['two', [{ type: 'known', version: '1.0' }]],
								['one', [{ type: 'known', version: '1.0' }]],
							]),
							connected: ['three', 'two', 'one'],
						},
					},
				},
			]);
		});

		test(`should create 1-2 2-3 2-4 1-5 5-6 complex tree`, () => {
			const [one, two, three, four, five, six] = createComplexTree();

			expect(three.peerConnections).toEqual(
				new Map([['two', new Set(['two', 'four', 'one', 'five', 'six'])]]),
			);
			expect(four.peerConnections).toEqual(
				new Map([['two', new Set(['two', 'three', 'one', 'five', 'six'])]]),
			);
			expect(six.peerConnections).toEqual(
				new Map([['five', new Set(['two', 'four', 'one', 'five', 'three'])]]),
			);
			expect(one.peerConnections).toEqual(
				new Map([
					['two', new Set(['two', 'three', 'four'])],
					['five', new Set(['five', 'six'])],
				]),
			);
			expect(two.peerConnections).toEqual(
				new Map([
					['one', new Set(['one', 'five', 'six'])],
					['three', new Set(['three'])],
					['four', new Set(['four'])],
				]),
			);
			expect(five.peerConnections).toEqual(
				new Map([
					['one', new Set(['one', 'two', 'three', 'four'])],
					['six', new Set(['six'])],
				]),
			);

			expectMessages(onMessage, [
				// 2-4
				{
					two: {
						from: 'four',
						to: ['two'],
						payload: {
							type: 'handshake',
							endpointId: 'two',
							remoteId: 'four',
							version: '1.0',
							knownPeers: new Map([['four', [{ type: 'known', version: '1.0' }]]]),
						},
					},
				},
				{
					four: {
						from: 'two',
						to: ['four'],
						payload: {
							type: 'handshake',
							endpointId: 'four',
							remoteId: 'two',
							version: '1.0',
							knownPeers: new Map([['two', [{ type: 'known', version: '1.0' }]]]),
						},
					},
				},
				{
					two: {
						from: 'four',
						to: ['two'],
						payload: {
							type: 'connect',
							version: '1.0',
							knownPeers: new Map([['four', [{ type: 'known', version: '1.0' }]]]),
							connected: ['four'],
						},
					},
				},
				{
					four: {
						from: 'two',
						to: ['four'],
						payload: {
							type: 'connect',
							version: '1.0',
							knownPeers: new Map([['two', [{ type: 'known', version: '1.0' }]]]),
							connected: ['two'],
						},
					},
				},
				// 2-3
				{
					two: {
						from: 'three',
						to: ['two'],
						payload: {
							type: 'handshake',
							endpointId: 'two',
							remoteId: 'three',
							version: '1.0',
							knownPeers: new Map([['three', [{ type: 'known', version: '1.0' }]]]),
						},
					},
				},
				{
					four: {
						from: 'two',
						to: [],
						payload: {
							type: 'connect',
							version: '1.0',
							knownPeers: new Map([['three', [{ type: 'known', version: '1.0' }]]]),
							connected: ['three'],
						},
					},
				},
				{
					three: {
						from: 'two',
						to: ['three'],
						payload: {
							type: 'handshake',
							endpointId: 'three',
							remoteId: 'two',
							version: '1.0',
							knownPeers: new Map([
								['two', [{ type: 'known', version: '1.0' }]],
								['four', [{ type: 'known', version: '1.0' }]],
							]),
						},
					},
				},
				{
					two: {
						from: 'three',
						to: ['two'],
						payload: {
							type: 'connect',
							version: '1.0',
							knownPeers: new Map([['three', [{ type: 'known', version: '1.0' }]]]),
							connected: ['three'],
						},
					},
				},
				{
					three: {
						from: 'two',
						to: ['three'],
						payload: {
							type: 'connect',
							version: '1.0',
							knownPeers: new Map([
								['two', [{ type: 'known', version: '1.0' }]],
								['four', [{ type: 'known', version: '1.0' }]],
							]),
							connected: ['two', 'four'],
						},
					},
				},
				// 1-5
				{
					one: {
						from: 'five',
						to: ['one'],
						payload: {
							type: 'handshake',
							endpointId: 'one',
							remoteId: 'five',
							version: '1.0',
							knownPeers: new Map([['five', [{ type: 'known', version: '1.0' }]]]),
						},
					},
				},
				{
					five: {
						from: 'one',
						to: ['five'],
						payload: {
							type: 'handshake',
							endpointId: 'five',
							remoteId: 'one',
							version: '1.0',
							knownPeers: new Map([['one', [{ type: 'known', version: '1.0' }]]]),
						},
					},
				},
				{
					one: {
						from: 'five',
						to: ['one'],
						payload: {
							type: 'connect',
							version: '1.0',
							knownPeers: new Map([['five', [{ type: 'known', version: '1.0' }]]]),
							connected: ['five'],
						},
					},
				},
				{
					five: {
						from: 'one',
						to: ['five'],
						payload: {
							type: 'connect',
							version: '1.0',
							knownPeers: new Map([['one', [{ type: 'known', version: '1.0' }]]]),
							connected: ['one'],
						},
					},
				},
				// 5-6
				{
					five: {
						from: 'six',
						to: ['five'],
						payload: {
							type: 'handshake',
							endpointId: 'five',
							remoteId: 'six',
							version: '1.0',
							knownPeers: new Map([['six', [{ type: 'known', version: '1.0' }]]]),
						},
					},
				},
				{
					one: {
						from: 'five',
						to: [],
						payload: {
							type: 'connect',
							version: '1.0',
							knownPeers: new Map([['six', [{ type: 'known', version: '1.0' }]]]),
							connected: ['six'],
						},
					},
				},
				{
					six: {
						from: 'five',
						to: ['six'],
						payload: {
							type: 'handshake',
							endpointId: 'six',
							remoteId: 'five',
							version: '1.0',
							knownPeers: new Map([
								['five', [{ type: 'known', version: '1.0' }]],
								['one', [{ type: 'known', version: '1.0' }]],
							]),
						},
					},
				},
				{
					five: {
						from: 'six',
						to: ['five'],
						payload: {
							type: 'connect',
							version: '1.0',
							knownPeers: new Map([['six', [{ type: 'known', version: '1.0' }]]]),
							connected: ['six'],
						},
					},
				},
				{
					six: {
						from: 'five',
						to: ['six'],
						payload: {
							type: 'connect',
							version: '1.0',
							knownPeers: new Map([
								['five', [{ type: 'known', version: '1.0' }]],
								['one', [{ type: 'known', version: '1.0' }]],
							]),
							connected: ['five', 'one'],
						},
					},
				},
				// 1-2
				{
					one: {
						from: 'two',
						to: ['one'],
						payload: {
							type: 'handshake',
							endpointId: 'one',
							remoteId: 'two',
							version: '1.0',
							knownPeers: new Map([
								['two', [{ type: 'known', version: '1.0' }]],
								['four', [{ type: 'known', version: '1.0' }]],
								['three', [{ type: 'known', version: '1.0' }]],
							]),
						},
					},
				},
				{
					five: {
						from: 'one',
						to: [],
						payload: {
							type: 'connect',
							version: '1.0',
							knownPeers: new Map([
								['two', [{ type: 'known', version: '1.0' }]],
								['three', [{ type: 'known', version: '1.0' }]],
								['four', [{ type: 'known', version: '1.0' }]],
							]),
							connected: ['two', 'four', 'three'],
						},
					},
				},
				{
					six: {
						from: 'one',
						to: [],
						payload: {
							type: 'connect',
							version: '1.0',
							knownPeers: new Map([
								['two', [{ type: 'known', version: '1.0' }]],
								['three', [{ type: 'known', version: '1.0' }]],
								['four', [{ type: 'known', version: '1.0' }]],
							]),
							connected: ['two', 'four', 'three'],
						},
					},
				},
				{
					two: {
						from: 'one',
						to: ['two'],
						payload: {
							type: 'handshake',
							endpointId: 'two',
							remoteId: 'one',
							version: '1.0',
							knownPeers: new Map([
								['one', [{ type: 'known', version: '1.0' }]],
								['five', [{ type: 'known', version: '1.0' }]],
								['six', [{ type: 'known', version: '1.0' }]],
							]),
						},
					},
				},
				{
					four: {
						from: 'two',
						to: [],
						payload: {
							type: 'connect',
							version: '1.0',
							knownPeers: new Map([
								['one', [{ type: 'known', version: '1.0' }]],
								['five', [{ type: 'known', version: '1.0' }]],
								['six', [{ type: 'known', version: '1.0' }]],
							]),
							connected: ['one', 'five', 'six'],
						},
					},
				},
				{
					three: {
						from: 'two',
						to: [],
						payload: {
							type: 'connect',
							version: '1.0',
							knownPeers: new Map([
								['one', [{ type: 'known', version: '1.0' }]],
								['five', [{ type: 'known', version: '1.0' }]],
								['six', [{ type: 'known', version: '1.0' }]],
							]),
							connected: ['one', 'five', 'six'],
						},
					},
				},
				{
					one: {
						from: 'two',
						to: ['one'],
						payload: {
							type: 'connect',
							version: '1.0',
							knownPeers: new Map([
								['two', [{ type: 'known', version: '1.0' }]],
								['three', [{ type: 'known', version: '1.0' }]],
								['four', [{ type: 'known', version: '1.0' }]],
							]),
							connected: ['two', 'four', 'three'],
						},
					},
				},
				{
					two: {
						from: 'one',
						to: ['two'],
						payload: {
							type: 'connect',
							version: '1.0',
							knownPeers: new Map([
								['one', [{ type: 'known', version: '1.0' }]],
								['five', [{ type: 'known', version: '1.0' }]],
								['six', [{ type: 'known', version: '1.0' }]],
							]),
							connected: ['one', 'five', 'six'],
						},
					},
				},
			]);
		});
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
			peer.listen({
				id: 'two',
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
					payload: {
						type: 'handshake',
						endpointId: 'one',
						remoteId: 'two',
						version: '1.0',
						knownPeers: new Map([['two', [{ type: 'known', version: '1.0' }]]]),
					},
				},
			},
			{
				two: {
					from: 'one',
					to: ['two'],
					payload: {
						type: 'handshake',
						endpointId: 'two',
						remoteId: 'one',
						version: '1.0',
						knownPeers: new Map([['one', [{ type: 'known', version: '1.0' }]]]),
					},
				},
			},
			{
				one: {
					from: 'two',
					to: ['one'],
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: new Map([['two', [{ type: 'known', version: '1.0' }]]]),
						connected: ['two'],
					},
				},
			},
			{
				two: {
					from: 'one',
					to: ['two'],
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: new Map([['one', [{ type: 'known', version: '1.0' }]]]),
						connected: ['one'],
					},
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
		one.listen(['two', 'three']);
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
					payload: {
						type: 'handshake',
						endpointId: 'one',
						remoteId: 'two',
						version: '1.0',
						knownPeers: new Map([['two', [{ type: 'known', version: '1.0' }]]]),
					},
				},
			},
			{
				two: {
					from: 'one',
					to: ['two'],
					payload: {
						type: 'handshake',
						endpointId: 'two',
						remoteId: 'one',
						version: '1.0',
						knownPeers: new Map([['one', [{ type: 'known', version: '1.0' }]]]),
					},
				},
			},
			{
				one: {
					from: 'two',
					to: ['one'],
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: new Map([['two', [{ type: 'known', version: '1.0' }]]]),
						connected: ['two'],
					},
				},
			},
			{
				two: {
					from: 'one',
					to: ['two'],
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: new Map([['one', [{ type: 'known', version: '1.0' }]]]),
						connected: ['one'],
					},
				},
			},
			// 1.send()
			{
				two: {
					from: 'one',
					to: [],
					payload: { type: 'known', version: '1.0' },
				},
			},
			// 1-3
			{
				one: {
					from: 'three',
					to: ['one'],
					payload: {
						type: 'handshake',
						endpointId: 'one',
						remoteId: 'three',
						version: '1.0',
						knownPeers: new Map([['three', [{ type: 'known', version: '1.0' }]]]),
					},
				},
			},
			{
				two: {
					from: 'one',
					to: [],
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: new Map([['three', [{ type: 'known', version: '1.0' }]]]),
						connected: ['three'],
					},
				},
			},
			{
				three: {
					from: 'one',
					to: ['three'],
					payload: {
						type: 'handshake',
						endpointId: 'three',
						remoteId: 'one',
						version: '1.0',
						knownPeers: new Map([
							['one', [{ type: 'known', version: '1.0' }]],
							['two', [{ type: 'known', version: '1.0' }]],
						]),
					},
				},
			},
			{
				one: {
					from: 'three',
					to: ['one'],
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: new Map([['three', [{ type: 'known', version: '1.0' }]]]),
						connected: ['three'],
					},
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
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: new Map([
							['one', [{ type: 'known', version: '1.0' }]],
							['two', [{ type: 'known', version: '1.0' }]],
						]),
						connected: ['one', 'two'],
					},
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
			// 1-2
			{
				one: {
					from: 'two',
					to: ['one'],
					payload: {
						type: 'handshake',
						endpointId: 'one',
						remoteId: 'two',
						version: '1.0',
						knownPeers: new Map([['two', [{ type: 'known', version: '1.0' }]]]),
					},
				},
			},
			{
				two: {
					from: 'one',
					to: ['two'],
					payload: {
						type: 'handshake',
						endpointId: 'two',
						remoteId: 'one',
						version: '1.0',
						knownPeers: new Map([['one', [{ type: 'known', version: '1.0' }]]]),
					},
				},
			},
			{
				one: {
					from: 'two',
					to: ['one'],
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: new Map([['two', [{ type: 'known', version: '1.0' }]]]),
						connected: ['two'],
					},
				},
			},
			{
				two: {
					from: 'one',
					to: ['two'],
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: new Map([['one', [{ type: 'known', version: '1.0' }]]]),
						connected: ['one'],
					},
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
		const [one] = createPeerTree();
		clearMessages();

		// 1-2, 1-3
		one.send({ type: 'known', version: '1.0' });

		expectMessages(onMessage, [
			{ two: { from: 'one', to: [], payload: { type: 'known', version: '1.0' } } },
			{ three: { from: 'one', to: [], payload: { type: 'known', version: '1.0' } } },
		]);
		expectErrors(onError, []);
	});

	test(`send() send direct messages`, () => {
		const [one, two] = createPeerTree();
		clearMessages();

		// 1-2, 1-3
		two.send({ type: 'known', version: '1.0' }, { to: ['three'] });
		one.send({ type: 'known', version: '1.0' }, { to: ['three'] });

		expectMessages(onMessage, [
			{ three: { from: 'two', to: ['three'], payload: { type: 'known', version: '1.0' } } },
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
				['three', [{ type: 'three-only', version: '1.0' }]],
			]),
		);
		expect(two.knownPeers).toEqual(
			new Map([
				['one', knownMessages],
				['two', knownMessages],
				['three', [{ type: 'three-only', version: '1.0' }]],
			]),
		);
		expect(three.knownPeers).toEqual(
			new Map([
				['one', knownMessages],
				['two', knownMessages],
				['three', [{ type: 'three-only', version: '1.0' }]],
			]),
		);

		expectMessages(onMessage, [
			// 1-2
			{
				one: {
					from: 'two',
					to: ['one'],
					payload: {
						type: 'handshake',
						endpointId: 'one',
						remoteId: 'two',
						version: '1.0',
						knownPeers: new Map([['two', [{ type: 'known', version: '1.0' }]]]),
					},
				},
			},
			{
				two: {
					from: 'one',
					to: ['two'],
					payload: {
						type: 'handshake',
						endpointId: 'two',
						remoteId: 'one',
						version: '1.0',
						knownPeers: new Map([['one', [{ type: 'known', version: '1.0' }]]]),
					},
				},
			},
			{
				one: {
					from: 'two',
					to: ['one'],
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: new Map([['two', [{ type: 'known', version: '1.0' }]]]),
						connected: ['two'],
					},
				},
			},
			{
				two: {
					from: 'one',
					to: ['two'],
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: new Map([['one', [{ type: 'known', version: '1.0' }]]]),
						connected: ['one'],
					},
				},
			},
			// 2-3
			{
				two: {
					from: 'three',
					to: ['two'],
					payload: {
						type: 'handshake',
						endpointId: 'two',
						remoteId: 'three',
						version: '1.0',
						knownPeers: new Map([['three', [{ type: 'three-only', version: '1.0' }]]]),
					},
				},
			},
			{
				one: {
					from: 'two',
					to: [],
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: new Map([['three', [{ type: 'three-only', version: '1.0' }]]]),
						connected: ['three'],
					},
				},
			},
			{
				three: {
					from: 'two',
					to: ['three'],
					payload: {
						type: 'handshake',
						endpointId: 'three',
						remoteId: 'two',
						version: '1.0',
						knownPeers: new Map([
							['two', [{ type: 'known', version: '1.0' }]],
							['one', [{ type: 'known', version: '1.0' }]],
						]),
					},
				},
			},
			{
				two: {
					from: 'three',
					to: ['two'],
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: new Map([['three', [{ type: 'three-only', version: '1.0' }]]]),
						connected: ['three'],
					},
				},
			},
			{
				three: {
					from: 'two',
					to: ['three'],
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: new Map([
							['one', [{ type: 'known', version: '1.0' }]],
							['two', [{ type: 'known', version: '1.0' }]],
						]),
						connected: ['two', 'one'],
					},
				},
			},
		]);
		expectErrors(onError, []);
	});

	test(`should forward unknown messages`, () => {
		const one = createPeer('one', { messageCheckStrategy: 'type' });
		const two = createPeer('two');
		const three = createPeer('three', {
			knownMessages: [{ type: 'three-only', version: '1.0' }],
		});

		// 1-2, 1-3
		one.listen(['two', 'three']);
		two.connect('one');
		three.connect('one');
		two.send({ type: 'three-only', version: '1.0' }, { to: 'three' });
		two.send({ type: 'three-only', version: '1.0' }, { to: ['three'] });
		two.send({ type: 'three-only', version: '1.0' });

		expectMessages(onMessage, [
			{
				one: {
					from: 'two',
					to: ['one'],
					payload: {
						type: 'handshake',
						endpointId: 'one',
						remoteId: 'two',
						version: '1.0',
						knownPeers: new Map([['two', [{ type: 'known', version: '1.0' }]]]),
					},
				},
			},
			{
				two: {
					from: 'one',
					to: ['two'],
					payload: {
						type: 'handshake',
						endpointId: 'two',
						remoteId: 'one',
						version: '1.0',
						knownPeers: new Map([['one', [{ type: 'known', version: '1.0' }]]]),
					},
				},
			},
			{
				one: {
					from: 'two',
					to: ['one'],
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: new Map([['two', [{ type: 'known', version: '1.0' }]]]),
						connected: ['two'],
					},
				},
			},
			{
				two: {
					from: 'one',
					to: ['two'],
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: new Map([['one', [{ type: 'known', version: '1.0' }]]]),
						connected: ['one'],
					},
				},
			},
			{
				one: {
					from: 'three',
					to: ['one'],
					payload: {
						type: 'handshake',
						endpointId: 'one',
						remoteId: 'three',
						version: '1.0',
						knownPeers: new Map([['three', [{ type: 'three-only', version: '1.0' }]]]),
					},
				},
			},
			{
				two: {
					from: 'one',
					to: [],
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: new Map([['three', [{ type: 'three-only', version: '1.0' }]]]),
						connected: ['three'],
					},
				},
			},
			{
				three: {
					from: 'one',
					to: ['three'],
					payload: {
						type: 'handshake',
						endpointId: 'three',
						remoteId: 'one',
						version: '1.0',
						knownPeers: new Map([
							['one', [{ type: 'known', version: '1.0' }]],
							['two', [{ type: 'known', version: '1.0' }]],
						]),
					},
				},
			},
			{
				one: {
					from: 'three',
					to: ['one'],
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: new Map([['three', [{ type: 'three-only', version: '1.0' }]]]),
						connected: ['three'],
					},
				},
			},
			{
				three: {
					from: 'one',
					to: ['three'],
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: new Map([
							['one', [{ type: 'known', version: '1.0' }]],
							['two', [{ type: 'known', version: '1.0' }]],
						]),
						connected: ['one', 'two'],
					},
				},
			},

			{ three: { from: 'two', to: ['three'], payload: { type: 'three-only', version: '1.0' } } },
			{ three: { from: 'two', to: ['three'], payload: { type: 'three-only', version: '1.0' } } },
			{
				two: {
					from: 'one',
					to: ['two'],
					payload: {
						type: 'error',
						version: '1.0',
						error: `Unknown message type "three-only". Known types: ["known"]`,
						message: {
							from: 'two',
							to: [],
							payload: { type: 'three-only', version: '1.0' },
						},
					},
				},
			},
			{ three: { from: 'two', to: [], payload: { type: 'three-only', version: '1.0' } } },
		]);
		expectErrors(onError, [
			{
				one: new MessageError(
					{ from: 'two', to: [], payload: { type: 'three-only', version: '1.0' } },
					`Unknown message type "three-only". Known types: ["known"]`,
				),
			},
		]);
	});

	test(`should handle simple 'x.disconnect(y)'`, () => {
		const [one, two, three, four] = createPeerChain();
		clearMessages();

		// 1-2-3-4
		// disconnect 1-2-x-3-4
		three.disconnect('two');

		expect(one.peerConnections).toEqual(new Map([['two', new Set(['two'])]]));
		expect(two.peerConnections).toEqual(new Map([['one', new Set(['one'])]]));
		expect(three.peerConnections).toEqual(new Map([['four', new Set(['four'])]]));
		expect(four.peerConnections).toEqual(new Map([['three', new Set(['three'])]]));

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

		expectMessages(onMessage, [
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
		]);
	});

	test(`should handle reconnect after 'x.disconnect()'`, () => {
		const [one, two, three, four] = createPeerChain();

		// 1-2-3-4
		// disconnect 2-3
		three.disconnect('two');
		clearMessages();

		// reconnect 2-3
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

		expectMessages(onMessage, [
			{
				two: {
					from: 'three',
					to: ['two'],
					payload: {
						type: 'handshake',
						endpointId: 'two',
						remoteId: 'three',
						version: '1.0',
						knownPeers: new Map([
							['three', [{ type: 'known', version: '1.0' }]],
							['four', [{ type: 'known', version: '1.0' }]],
						]),
					},
				},
			},
			{
				one: {
					from: 'two',
					to: [],
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: new Map([
							['three', [{ type: 'known', version: '1.0' }]],
							['four', [{ type: 'known', version: '1.0' }]],
						]),
						connected: ['three', 'four'],
					},
				},
			},
			{
				three: {
					from: 'two',
					to: ['three'],
					payload: {
						type: 'handshake',
						endpointId: 'three',
						remoteId: 'two',
						version: '1.0',
						knownPeers: new Map([
							['two', [{ type: 'known', version: '1.0' }]],
							['one', [{ type: 'known', version: '1.0' }]],
						]),
					},
				},
			},
			{
				four: {
					from: 'three',
					to: [],
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: new Map([
							['one', [{ type: 'known', version: '1.0' }]],
							['two', [{ type: 'known', version: '1.0' }]],
						]),
						connected: ['two', 'one'],
					},
				},
			},
			{
				two: {
					from: 'three',
					to: ['two'],
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: new Map([
							['three', [{ type: 'known', version: '1.0' }]],
							['four', [{ type: 'known', version: '1.0' }]],
						]),
						connected: ['three', 'four'],
					},
				},
			},
			{
				three: {
					from: 'two',
					to: ['three'],
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: new Map([
							['one', [{ type: 'known', version: '1.0' }]],
							['two', [{ type: 'known', version: '1.0' }]],
						]),
						connected: ['two', 'one'],
					},
				},
			},
		]);
	});

	test(`should handle 'x.disconnect()'`, () => {
		const [one, two, three, four] = createPeerChain();
		clearMessages();

		// 1-2-3-4
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
			// 2.disconnect()
			// 2-3 disconnect: 1-2-x-3-4
			{
				three: {
					from: 'two',
					to: [],
					payload: {
						type: 'disconnect',
						version: '1.0',
						disconnected: 'two',
						unreachable: ['two', 'one'],
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
						unreachable: ['two', 'one'],
					},
				},
			},
			// 2-1 disconnect: 1-x-2-x-3-4
			{
				one: {
					from: 'two',
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

	test(`should disconnect exising when reconnecting with the same id`, () => {
		const [one, two, oldThree] = createPeerTree();
		clearMessages();

		// 1-2, 1-3
		// simulating reconnection 1-3, different peer instance, same id
		const newThree = createPeer('three');
		newThree.connect('one');

		// should have received 'disconnect' message and become detached
		expect(oldThree.peerConnections).toEqual(new Map());
		expect(oldThree.knownPeers).toEqual(new Map([['three', knownMessages]]));

		// network should stay the same
		expect(one.peerConnections).toEqual(
			new Map([
				['two', new Set(['two'])],
				['three', new Set(['three'])],
			]),
		);
		expect(two.peerConnections).toEqual(new Map([['one', new Set(['one', 'three'])]]));
		expect(newThree.peerConnections).toEqual(new Map([['one', new Set(['one', 'two'])]]));

		// network should stay the same
		for (const peer of [one, two, newThree]) {
			expect(peer.knownPeers).toEqual(
				new Map([
					['one', knownMessages],
					['two', knownMessages],
					['three', knownMessages],
				]),
			);
		}

		expectMessages(onMessage, [
			// on 3.connect(1) existing 'three' should get disconnected
			{
				three: {
					from: 'one',
					to: [],
					payload: {
						type: 'disconnect',
						version: '1.0',
						disconnected: 'one',
						unreachable: ['one', 'two'],
					},
				},
			},
			{
				two: {
					from: 'one',
					to: [],
					payload: {
						type: 'disconnect',
						version: '1.0',
						disconnected: 'three',
						unreachable: ['three'],
					},
				},
			},
			// Handle handshake as in normal connection:
			// 3 -> 1 handshake
			// 1 -> 2 connect(3)
			// 1 -> 3 handshake
			// 3 -> 1 connect(3)
			// 1 -> 3 connect(1,2)
			{
				one: {
					from: 'three',
					to: ['one'],
					payload: {
						type: 'handshake',
						endpointId: 'one',
						remoteId: 'three',
						version: '1.0',
						knownPeers: new Map([['three', [{ type: 'known', version: '1.0' }]]]),
					},
				},
			},
			{
				two: {
					from: 'one',
					to: [],
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: new Map([['three', [{ type: 'known', version: '1.0' }]]]),
						connected: ['three'],
					},
				},
			},
			{
				three: {
					from: 'one',
					to: ['three'],
					payload: {
						type: 'handshake',
						endpointId: 'three',
						remoteId: 'one',
						version: '1.0',
						knownPeers: new Map([
							['one', [{ type: 'known', version: '1.0' }]],
							['two', [{ type: 'known', version: '1.0' }]],
						]),
					},
				},
			},
			{
				one: {
					from: 'three',
					to: ['one'],
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: new Map([['three', [{ type: 'known', version: '1.0' }]]]),
						connected: ['three'],
					},
				},
			},
			{
				three: {
					from: 'one',
					to: ['three'],
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: new Map([
							['one', [{ type: 'known', version: '1.0' }]],
							['two', [{ type: 'known', version: '1.0' }]],
						]),
						connected: ['one', 'two'],
					},
				},
			},
		]);
		expectErrors(onError, []);
	});

	test(`should not disconnect exising when reconnecting with the same id and using filter`, () => {
		const one = createPeer('one');
		const two = createPeer('two');

		// 1-2
		one.listen(({ from }) => !one.knownPeers.has(from));
		two.connect('one');

		for (const peer of [one, two]) {
			expect(peer.knownPeers).toEqual(
				new Map([
					['one', knownMessages],
					['two', knownMessages],
				]),
			);
		}

		clearMessages();

		// simulating reconnection 1-2, different peer instance, same id
		const newTwo = createPeer('two');
		newTwo.connect('one');

		// no messages should be sent, handshake should be blocked by filter
		expectMessages(onMessage, []);
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
					['one', [{ type: 'new', version: '1.0' }]],
					['two', []],
					['three', knownMessages],
				]),
			);
		}

		expectMessages(onMessage, [
			// 1-2
			{
				one: {
					from: 'two',
					to: ['one'],
					payload: {
						type: 'handshake',
						endpointId: 'one',
						remoteId: 'two',
						version: '1.0',
						knownPeers: new Map([['two', []]]),
					},
				},
			},
			{
				two: {
					from: 'one',
					to: ['two'],
					payload: {
						type: 'handshake',
						endpointId: 'two',
						remoteId: 'one',
						version: '1.0',
						knownPeers: new Map([['one', [{ type: 'new', version: '1.0' }]]]),
					},
				},
			},
			{
				one: {
					from: 'two',
					to: ['one'],
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: new Map([['two', []]]),
						connected: ['two'],
					},
				},
			},
			{
				two: {
					from: 'one',
					to: ['two'],
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: new Map([['one', []]]),
						connected: ['one'],
					},
				},
			},
			// 2-3
			{
				two: {
					from: 'three',
					to: ['two'],
					payload: {
						type: 'handshake',
						endpointId: 'two',
						remoteId: 'three',
						version: '1.0',
						knownPeers: new Map([['three', [{ type: 'known', version: '1.0' }]]]),
					},
				},
			},
			{
				one: {
					from: 'two',
					to: [],
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: new Map([['three', [{ type: 'known', version: '1.0' }]]]),
						connected: ['three'],
					},
				},
			},
			{
				three: {
					from: 'two',
					to: ['three'],
					payload: {
						type: 'handshake',
						endpointId: 'three',
						remoteId: 'two',
						version: '1.0',
						knownPeers: new Map([
							['two', []],
							['one', [{ type: 'new', version: '1.0' }]],
						]),
					},
				},
			},
			{
				two: {
					from: 'three',
					to: ['two'],
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: new Map([['three', [{ type: 'known', version: '1.0' }]]]),
						connected: ['three'],
					},
				},
			},
			{
				three: {
					from: 'two',
					to: ['three'],
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: new Map([
							['one', []],
							['two', []],
						]),
						connected: ['two', 'one'],
					},
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
		const onMessage = vi.fn();
		const onServiceMessage = vi.fn();

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
		expect(onServiceMessage.mock.calls.length).toBe(2); // initial connect message

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
			[{ type: 'handshake', version: '1.0' }],
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
			{
				type: 'handshake',
				endpointId: 'one',
				remoteId: 'two',
				version: '1.0',
				knownPeers: new Map([['two', [{ type: 'known', version: '1.0' }]]]),
			},
			{
				type: 'connect',
				version: '1.0',
				knownPeers: new Map([['two', [{ type: 'known', version: '1.0' }]]]),
				connected: ['two'],
			},
		]);
		expect(twoMessages).toEqual([
			{
				type: 'handshake',
				endpointId: 'two',
				remoteId: 'one',
				version: '1.0',
				knownPeers: new Map([['one', [{ type: 'known', version: '1.0' }]]]),
			},
			{
				type: 'connect',
				version: '1.0',
				knownPeers: new Map([['one', [{ type: 'known', version: '1.0' }]]]),
				connected: ['one'],
			},
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

	test(`should reuse the same listener when '.listen()' multiple times`, () => {
		const one = new MessagePeer({ id: 'one' });

		const listener1 = one.listen('two');
		const listener2 = one.listen('two');

		expect(listener1 === listener2).toBe(true);
	});

	test(`should reuse exising filters when calling '.listen()' after stop`, () => {
		const one = new MessagePeer({ id: 'one' });
		expect(one.connectionFilters).toEqual([]);

		// 1. Change -> stop
		// [] -> [two]
		const stop = one.listen('two');
		expect(one.connectionFilters).toEqual(['two']);

		// not resetting filters on stop
		stop();
		expect(one.connectionFilters).toEqual(['two']);

		// restarting with the same filters
		one.listen();
		expect(one.connectionFilters).toEqual(['two']);
	});

	test(`should allow updating '.listen()' filters via setter`, () => {
		const one = new MessagePeer({ id: 'one' });
		expect(one.connectionFilters).toEqual([]);

		// Update via '.listen()'
		// [] -> [two]
		one.listen('two');
		expect(one.connectionFilters).toEqual(['two']);

		// Update via setter
		// [two] -> [three]
		one.connectionFilters = ['three'];
		expect(one.connectionFilters).toEqual(['three']);
	});

	test(`should allow adding and removing '.listen()' filters`, () => {
		const one = new MessagePeer({ id: 'one' });
		one.connectionFilters = ['two'];
		expect(one.connectionFilters).toEqual(['two']);

		// 1. Update via array spread in '.listen()'
		// [two] -> [two, three]
		one.listen([...one.connectionFilters, 'three']);
		expect(one.connectionFilters).toEqual(['two', 'three']);

		// 2. Update via setter
		// [two, three] -> [three]
		one.connectionFilters = one.connectionFilters.filter((id) => id !== 'two');
		expect(one.connectionFilters).toEqual(['three']);
	});

	test(`should use function filters for '.listen()'`, () => {
		const one = new MessagePeer({ id: 'one' });
		const two = new MessagePeer({ id: 'two' });

		const calledWith: any[] = [];

		one.listen(({ from, to, payload }, source, origin) => {
			calledWith.push(`${from}->${to}:${payload.type}`, origin, source);
			return true;
		});
		two.connect('one');

		expect(calledWith).toEqual(['two->one:handshake', 'https://test.com', undefined]);
	});

	test(`should reuse the same connection when '.connect()' multiple times`, () => {
		const two = new MessagePeer({ id: 'two' });

		const promise1 = two.connect('one');
		const promise2 = two.connect('one');

		expect(promise1 === promise2).toBe(true);
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

	test(`should not queue a 'disconnect' message if nobody is connected`, () => {
		const one = createPeer('one');
		const two = createPeer('two');

		one.listen('two');
		one.disconnect('two'); // should not schedule a disconnect message
		two.connect('one');

		expectMessages(onMessage, [
			{
				one: {
					from: 'two',
					to: ['one'],
					payload: {
						type: 'handshake',
						endpointId: 'one',
						remoteId: 'two',
						version: '1.0',
						knownPeers: new Map([['two', [{ type: 'known', version: '1.0' }]]]),
					},
				},
			},
			{
				two: {
					from: 'one',
					to: ['two'],
					payload: {
						type: 'handshake',
						endpointId: 'two',
						remoteId: 'one',
						version: '1.0',
						knownPeers: new Map([['one', [{ type: 'known', version: '1.0' }]]]),
					},
				},
			},
			{
				one: {
					from: 'two',
					to: ['one'],
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: new Map([['two', [{ type: 'known', version: '1.0' }]]]),
						connected: ['two'],
					},
				},
			},
			{
				two: {
					from: 'one',
					to: ['two'],
					payload: {
						type: 'connect',
						version: '1.0',
						knownPeers: new Map([['one', [{ type: 'known', version: '1.0' }]]]),
						connected: ['one'],
					},
				},
			},
		]);
	});
});
