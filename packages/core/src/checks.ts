import type { Message, RoutedMessage } from './message';
import { MessageError } from './message-error';
import type { MessagePeerType } from './peer';

/**
 * A strategy that a message peer uses to check messages upon reception.
 * - `default` - checks that the message structure is correct (from, to, type, version and payload are present)
 * - `type` - checks that the message type is known for the peer
 * - `version` - checks that the message version is known for the peer
 */
export type MessageCheckStrategy = 'default' | 'type' | 'version';

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
export function checkMessageIsKnown<M extends Message>(
	message: RoutedMessage<M>,
	peer: MessagePeerType<M>,
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
export function checkMessageVersionIsKnown<M extends Message>(
	message: RoutedMessage<M>,
	peer: MessagePeerType<M>,
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
 * Get default message checks for the given strategy
 *
 * @param strategy
 */
export function getDefaultMessageChecks<M extends Message>(
	strategy: MessageCheckStrategy,
): MessageCheck<M>[] {
	const checks: MessageCheck<M>[] = [];

	if (strategy === 'type' || strategy === 'version') {
		checks.push({
			description: 'Check that message type is known',
			check: checkMessageIsKnown,
		});
	}

	if (strategy === 'version') {
		checks.push({
			description: 'Check that message version is known',
			check: checkMessageVersionIsKnown,
		});
	}

	return checks;
}
