import { Message, RoutedMessage } from './message';
import { MessageError } from './message-error';

const DEBUG = true;

/**
 * Logs things
 * @param args - whatever
 */
export function logger(...args: unknown[]) {
	if (DEBUG) {
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
