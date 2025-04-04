import { Component, inject } from '@angular/core';
import { MessagingService } from './messaging.service';
import { MessagePeer } from '@amadeus-it-group/microfrontends';

@Component({
	selector: 'one-client-core',
	template: `
		<h3>Core Client &rarr; Host</h3>
		<div class="buttons">
			<button (click)="msg.sendValid(client)">Valid message</button>
			<button (click)="msg.sendMalformed(client)">Malformed message</button>
			<button (click)="msg.sendTypeOnly(client)">Type only message</button>
			<button (click)="msg.sendUnsupportedType(client)">Unsupported type</button>
			<button (click)="msg.sendUnsupportedVersion(client)">Unsupported version</button>
		</div>
	`,
})
export class ClientCoreComponent {
	client = new MessagePeer({
		id: 'client-core',
		knownMessages: [{ type: 'test', version: '1.0' }],
		messageCheckStrategy: 'version',
	});
	msg = inject(MessagingService);

	constructor() {
		this.client.connect('host');

		this.client.messages.subscribe((message) =>
			console.log(`Client '${this.client.id}' received:`, message),
		);

		this.client.errors.subscribe((error) => {
			console.error(`Client '${this.client.id}' error:`, error);
		});
	}
}
