import { Component, inject, signal } from '@angular/core';
import {
	MESSAGE_PEER_CONFIG,
	MessagePeerConfig,
	MessagePeerService,
} from '@amadeus-it-group/microfrontends-angular';

@Component({
	selector: 'app-client',
	template: `<h1>Client</h1>
		<p>{{ message() }}</p> `,
	providers: [
		{
			provide: MESSAGE_PEER_CONFIG,
			useValue: {
				id: 'client',
			} satisfies MessagePeerConfig,
		},
		MessagePeerService,
	],
})
export class Client {
	message = signal('no host messages');

	constructor() {
		const client = inject(MessagePeerService);
		client.serviceMessages$.subscribe(({ from, payload }) => {
			this.message.set(`${from}-${payload.type}`);
		});

		client.connect('host');
	}
}
