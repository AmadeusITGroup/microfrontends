import { MessageError } from './message-error';
import type { Message, RoutedMessage } from './message';

describe(`MessageError`, () => {
	test(`should be a specific error subclass`, () => {
		const error: RoutedMessage<Message> = {
			from: 'from',
			to: [],
			payload: {
				type: 'test',
				version: '1.0',
			},
		};
		const messageError = new MessageError(error, 'test error');

		expect(messageError.name).toBe('MessageError');
		expect(messageError.message).toBe('test error');
		expect(messageError.messageObject).toBe(error);
		expect(messageError.stack).toBeDefined();
	});
});
