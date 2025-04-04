import { Injectable } from '@angular/core';
import { MyMessage } from './messages';
import { Message, MessagePeerType } from '@amadeus-it-group/microfrontends';

export type Sendable<M extends Message> = Pick<MessagePeerType<M>, 'send'>;

@Injectable({ providedIn: 'root' })
export class MessagingService {
	sendValid(peer: Sendable<MyMessage>) {
		peer.send({
			type: 'test',
			version: '1.0',
			data: 'test',
		});
	}

	sendMalformed(peer: Sendable<MyMessage>) {
		peer.send({
			blah: 'test',
		} as unknown as MyMessage);
	}

	sendTypeOnly(peer: Sendable<MyMessage>) {
		peer.send({
			type: 'test',
		} as unknown as MyMessage);
	}

	sendUnsupportedType(peer: Sendable<MyMessage>) {
		peer.send({
			type: 'unsupported',
			version: '1.1',
		} as unknown as MyMessage);
	}

	sendUnsupportedVersion(peer: Sendable<MyMessage>) {
		peer.send({
			type: 'test',
			version: '3.0',
			data: 'test',
		} as unknown as MyMessage);
	}
}
