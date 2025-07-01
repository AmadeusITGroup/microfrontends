// registering a custom event for handshake messages
import { HandshakeMessage, RoutedMessage } from './message';
import { checkMessageHasCorrectStructure, logger } from './utils';

declare global {
	interface WindowEventMap {
		handshake: CustomEvent<MessageEvent<RoutedMessage<never>>>;
	}
}

export type HandshakeEvent<M> =
	| MessageEvent<RoutedMessage<M & HandshakeMessage>>
	| CustomEvent<MessageEvent<RoutedMessage<M & HandshakeMessage>>>;

/**
 * A global map of handshake handlers that are listening for incoming connections.
 * Maps peer id to a function that handles the handshake event for this peer.
 */
const HANDSHAKE_HANDLERS = new Map<string, (event: MessageEvent) => void>();

/**
 * Registers a global handshake handler for a specific peer id.
 * @param id
 * @param h
 */
export function registerGlobalHandshakeHandler(id: string, h: (event: MessageEvent) => void): void {
	HANDSHAKE_HANDLERS.set(id, h);
}

/**
 * Unregisters a global handshake handler for a specific peer id.
 *
 * @param id
 */
export function unregisterGlobalHandshakeHandler(id: string): void {
	HANDSHAKE_HANDLERS.delete(id);
}

/**
 * Global handler for handshake messages.
 *
 * It checks if the message has the correct structure, is a handshake message,
 * and if there is a peer that is listening for this handshake
 *
 * @param handshakeEvent - postMessage or custom event that contains the handshake message
 */
export const GLOBAL_HANDSHAKE_HANDLER = (handshakeEvent: HandshakeEvent<HandshakeMessage>) => {
	let event;
	if (handshakeEvent instanceof CustomEvent) {
		event = handshakeEvent.detail;
		logger(`Received 'CustomEvent'`, handshakeEvent);
	} else {
		event = handshakeEvent;
		logger(`Received 'postMessage'`, handshakeEvent);
	}

	const message = event.data;

	// only accept messages of the expected structure (from, to, payload)
	try {
		checkMessageHasCorrectStructure(message);

		const { payload } = message;

		// -> (structure ok)
		// 1. Is this a 'handshake' message destined for us?
		if (!(payload.type === `handshake`)) {
			return;
		}

		// -> (structure ok; message of type 'handshake')
		// 2. Is there a handshakeHandler that is listening for connections?
		const handshakeHandler = HANDSHAKE_HANDLERS.get(payload.endpointId);
		if (handshakeHandler) {
			handshakeHandler(event);
		} else {
			logger(`HS declined: peer '${payload.endpointId}' is not among listening peers:`, [
				...HANDSHAKE_HANDLERS.keys(),
			]);
		}
	} catch {
		// ignore malformed messages
	}
};

window.addEventListener('message', GLOBAL_HANDSHAKE_HANDLER);
window.addEventListener('handshake', GLOBAL_HANDSHAKE_HANDLER);
