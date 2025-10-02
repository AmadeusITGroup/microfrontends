import { Component, inject, signal } from '@angular/core';
import {
	MESSAGE_PEER_CONFIG,
	MessagePeerConfig,
	MessagePeerService,
} from '@amadeus-it-group/microfrontends-angular';

@Component({
	selector: 'app-host',
	template: `<h1>Host</h1>
		<p>{{ message() }}</p> `,
	providers: [
		{
			provide: MESSAGE_PEER_CONFIG,
			useValue: {
				id: 'host',
			} satisfies MessagePeerConfig,
		},
		MessagePeerService,
	],
})
export class Host {
	message = signal('no client messages');

	constructor() {
		const host = inject(MessagePeerService);
		host.serviceMessages$.subscribe(({ from, payload }) => {
			this.message.set(`${from}-${payload.type}`);
		});

		host.listen();
	}
}
