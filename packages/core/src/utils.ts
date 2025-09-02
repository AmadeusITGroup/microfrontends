import { HandshakeMessage, Message, RoutedMessage } from './message';
import { MessageError } from './message-error';
import { MessageCheckStrategy } from './checks';
import {
	NormalizedPeerConnectionFilter,
	PeerConnectionFilter,
	PeerConnectionFilterFn,
} from './peer';

let LOGGING_ENABLED = false;

/**
 * If true, tracing information to help debugging will be logged in the console
 * @param enabled
 */
export function enableLogging(enabled = true) {
	LOGGING_ENABLED = enabled;
}

/**
 * Logs things
 * @param args - whatever
 */
export function logger(...args: unknown[]) {
	if (LOGGING_ENABLED) {
		console.log(...args);
	}
}

/**
 * Checks that message has correct 'from', 'to', 'payload', 'payload.type' and 'payload.version' properties
 * @param message Message to check
 * @param strategy Message check strategy
 * @throws MessageError
 */
export function checkMessageHasCorrectStructure(
	message: RoutedMessage<Message>,
	strategy: MessageCheckStrategy = 'default',
) {
	// check 'from' and 'to'
	if (
		!(
			message &&
			message.from &&
			message.to &&
			typeof message.from === 'string' &&
			Array.isArray(message.to)
		)
	) {
		throw new MessageError(
			message,
			`Message should have 'from'(string) and 'to'(string|string[]) properties`,
		);
	}

	// check 'payload', 'payload.type'
	const { payload } = message;
	if (!(payload && payload.type && typeof payload.type === 'string')) {
		throw new MessageError(
			message,
			`Message should have 'payload' property that has 'type'(string) defined`,
		);
	}

	// check 'payload.version' only if necessary
	if (strategy === 'version' && !(payload.version && typeof payload.version === 'string')) {
		throw new MessageError(
			message,
			`Message should have 'payload' property that has 'version'(string) defined`,
		);
	}
}

export function checkOriginIsValid(origin: string) {
	const parsedURL = URL.parse(origin);
	if (!parsedURL) {
		throw new Error(`'${origin}' is not a valid URL`);
	}

	if (parsedURL.origin !== origin) {
		throw new Error(`'${origin}' is not a valid origin, did you mean '${parsedURL.origin}'?`);
	}
}

export function normalizeFilter(
	filter: string | PeerConnectionFilter | PeerConnectionFilterFn,
): NormalizedPeerConnectionFilter {
	switch (typeof filter) {
		case 'string':
			return { id: filter };
		case 'function':
			return { predicate: filter };
		default:
			return filter;
	}
}

export function createHandshakeMessage(
	from: string,
	to: string,
	knownPeers: Map<string, Message[]>,
): RoutedMessage<HandshakeMessage> {
	return structuredClone({
		from,
		to: [to],
		payload: {
			type: 'handshake',
			version: '1.0',
			endpointId: to,
			remoteId: from,
			knownPeers,
		},
	});
}

export function eventMatchesFilters(
	event: MessageEvent<RoutedMessage<HandshakeMessage>>,
	connectionFilters: NormalizedPeerConnectionFilter[],
) {
	const { origin, source, data: message } = event;
	const { remoteId } = message.payload;

	return (
		connectionFilters.length === 0 ||
		connectionFilters.some(
			(f) =>
				(f.id !== undefined || f.source !== undefined || f.origin !== undefined || f.predicate) &&
				(f.id === undefined || f.id === remoteId) &&
				(f.source === undefined || f.source === source) &&
				(f.origin === undefined ||
					f.origin === origin ||
					(origin === 'null' && f.source === source)) &&
				(f.predicate === undefined || f.predicate(message, source, origin)),
		)
	);
}
