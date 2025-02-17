import { checkMessageIsKnown, checkMessageVersionIsKnown } from './checks';
import { RoutedMessage } from './message';
import { MessagePeerType } from './peer';

function testMessage(payload: any): RoutedMessage<any> {
	return {
		from: 'from',
		to: [],
		payload,
	};
}

describe('checkMessageIsKnown()', () => {
	const peerMock: any = {
		id: 'peer',
		knownPeers: new Map([['peer', [{ type: 'known', version: '1.0' }]]]),
	} satisfies Partial<MessagePeerType<any>>;

	test(`should not throw when receiving a known message type`, () => {
		const message = testMessage({ type: 'known' });
		expect(() => checkMessageIsKnown(message, peerMock)).not.toThrow();
	});

	test(`should throw when receiving unknown message type`, () => {
		const message = testMessage({ type: 'unknown' });
		expect(() => checkMessageIsKnown(message, peerMock)).toThrow(
			`Unknown message type "unknown". Known types: ["known"]`,
		);
	});

	test(`should throw when receiving no message type`, () => {
		const message = testMessage({});
		expect(() => checkMessageIsKnown(message, peerMock)).toThrow(
			`Unknown message type "undefined". Known types: ["known"]`,
		);
	});
});

describe('checkMessageVersionIsKnown()', () => {
	const mockPeer: any = {
		id: 'peer',
		knownPeers: new Map([
			[
				'peer',
				[
					{ type: 'known', version: '1.0' },
					{ type: 'known', version: '2.0' },
				],
			],
		]),
	} satisfies Partial<MessagePeerType<any>>;

	test(`should not throw when receiving a known message type`, () => {
		const message = testMessage({ type: 'known', version: '1.0' });
		expect(() => checkMessageVersionIsKnown(message, mockPeer)).not.toThrow();
	});

	test(`should throw when receiving unknown message version`, () => {
		const message = testMessage({ type: 'known', version: '3.0' });
		expect(() => checkMessageVersionIsKnown(message, mockPeer)).toThrow(
			`Unknown message version "3.0". Known versions: ["1.0","2.0"]`,
		);
	});

	test(`should throw when receiving no version`, () => {
		const message = testMessage({ type: 'known' });
		expect(() => checkMessageVersionIsKnown(message, mockPeer)).toThrow(
			`Unknown message version "undefined". Known versions: ["1.0","2.0"]`,
		);
	});
});
