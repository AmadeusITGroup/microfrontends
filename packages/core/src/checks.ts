import type { Message, RoutedMessage } from './message';
import { MessageError } from './message-error';
import type { MessagePeerType } from './peer';

/**
 * A check that endpoint performs on messages
 */
export interface MessageCheck<M extends Message> {
	description: string;
	check: (message: RoutedMessage<M>, peer: MessagePeerType<M>) => void;
}

/**
 * Checks that message type is known for the peer
 * @param message Message to check
 * @param peer Endpoint that processes the message
 */
export function checkMessageIsKnown(
	message: RoutedMessage<Message>,
	peer: MessagePeerType<Message>,
) {
	const knownMessages = peer.knownPeers.get(peer.id);
	const { payload } = message;
	if (knownMessages && !knownMessages.find(({ type }) => type === payload.type)) {
		const knownTypes = [...new Set<string>(knownMessages.map(({ type }) => type))];
		throw new MessageError(
			message,
			`Unknown message type "${payload.type}". Known types: ${JSON.stringify(knownTypes)}`,
		);
	}
}

/**
 * Checks that message version is known for the peer
 * @param message Message to check
 * @param peer Endpoint that processes the message
 */
export function checkMessageVersionIsKnown(
	message: RoutedMessage<Message>,
	peer: MessagePeerType<Message>,
) {
	const knownMessages = peer.knownPeers.get(peer.id);
	const { payload } = message;
	if (
		knownMessages &&
		!knownMessages?.find(
			({ type, version }) => type === payload.type && version === payload.version,
		)
	) {
		const knownVersions = knownMessages
			.filter(({ type }) => type === payload.type)
			.map(({ version }) => version);
		throw new MessageError(
			message,
			`Unknown message version "${payload.version}". Known versions: ${JSON.stringify(knownVersions)}`,
		);
	}
}

/**
 * Default message checks that peer performs on incoming messages
 */
export const PEER_MESSAGE_CHECKS: MessageCheck<Message>[] = [
	{
		description: 'Check that message is known',
		check: checkMessageIsKnown,
	},
	{
		description: 'Check that message version is known',
		check: checkMessageVersionIsKnown,
	},
];
