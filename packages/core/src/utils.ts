import { Message, RoutedMessage } from './message';
import { MessageError } from './message-error';

let LOGGING_ENABLED = false;

/**
 * If true, tracing information to help debugging will be logged in the console
 * @param enabled
 */
export function enableLogging(enabled: boolean) {
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
 * @throws MessageError
 */
export function checkMessageHasCorrectStructure(message: RoutedMessage<Message>) {
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

	// check 'payload', 'payload.type' and 'payload.version'
	const { payload } = message;
	if (
		!(
			payload &&
			payload.type &&
			payload.version &&
			typeof payload.type === 'string' &&
			typeof payload.version === 'string'
		)
	) {
		throw new MessageError(
			message,
			`Message should have 'payload' property that has 'type'(string) and 'version'(string) defined`,
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
