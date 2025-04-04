import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
	MESSAGE_PEER_CONFIG,
	MessagePeerConfig,
	MessagePeerService,
} from '@amadeus-it-group/microfrontends-angular';
import { MyMessage } from './messages';
import { MessagingService } from './messaging.service';

@Component({
	selector: 'one-client-angular',
	template: `
		<h3>Angular Client &rarr; Host</h3>
		<div class="buttons">
			<button (click)="msg.sendValid(client)">Valid message</button>
			<button (click)="msg.sendMalformed(client)">Malformed message</button>
			<button (click)="msg.sendTypeOnly(client)">Type only message</button>
			<button (click)="msg.sendUnsupportedType(client)">Unsupported type</button>
			<button (click)="msg.sendUnsupportedVersion(client)">Unsupported version</button>
		</div>
	`,
	providers: [
		{
			provide: MESSAGE_PEER_CONFIG,
			useValue: {
				id: 'client-angular',
				knownMessages: [{ type: 'test', version: '1.0' }],
				messageCheckStrategy: 'version',
			} as MessagePeerConfig,
		},
		MessagePeerService,
	],
})
export class ClientAngularComponent {
	client: MessagePeerService<MyMessage> = inject(MessagePeerService);
	msg = inject(MessagingService);

	constructor() {
		this.client.connect('host');

		this.client.messages$
			.pipe(takeUntilDestroyed())
			.subscribe((message) => console.log(`Client '${this.client.id}' received:`, message));

		this.client.errors$.subscribe((error) => {
			console.error(`Client '${this.client.id}' error:`, error);
		});
	}
}
