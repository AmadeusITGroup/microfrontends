import { Message, RoutedMessage } from './message';

/**
 * Error class for errors related to message processing
 * @param message - The error message
 * @param messageObject - The message that caused the error
 */
export class MessageError extends Error {
	constructor(
		public messageObject: RoutedMessage<Message>,
		message: string,
	) {
		super(message);
		this.name = 'MessageError';
	}
}
