import { Component, inject } from '@angular/core';
import { MyMessage } from './messages';
import {
	MESSAGE_PEER_CONFIG,
	MessagePeerConfig,
	MessagePeerService,
} from '@amadeus-it-group/microfrontends-angular';
import { MessagingService } from './messaging.service';

@Component({
	selector: 'one-host',
	template: `
		<h3>Host &rarr; Clients</h3>
		<div class="buttons">
			<button (click)="msg.sendValid(host)">Valid message</button>
			<button (click)="msg.sendMalformed(host)">Malformed message</button>
			<button (click)="msg.sendTypeOnly(host)">Type only message</button>
			<button (click)="msg.sendUnsupportedType(host)">Unsupported type</button>
			<button (click)="msg.sendUnsupportedVersion(host)">Unsupported version</button>
		</div>
	`,
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
export class HostComponent {
	host: MessagePeerService<MyMessage> = inject(MessagePeerService);
	msg = inject(MessagingService);

	constructor() {
		this.host.listen();

		this.host.messages$.subscribe(({ payload }) => {
			if (payload.type === 'test') {
				switch (payload.version) {
					case '1.0':
						console.log('Host -> Client 1.0:', payload.data.length);
						break;
					case '2.0':
						console.log('Host -> Client 2.0:', payload.data.push('2'));
						break;
				}
			}
		});
	}
}
