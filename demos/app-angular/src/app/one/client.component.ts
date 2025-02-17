import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
	MESSAGE_PEER_CONFIG,
	MessagePeerConfig,
	MessagePeerService,
} from '@amadeus-it-group/microfrontends-angular';
import { IdService } from './id.service';
import { MyMessage } from './messages';

@Component({
	selector: 'one-client',
	standalone: true,
	template: `
		<h3>Client &rarr; Host</h3>
		<div class="buttons">
			<button (click)="sendValid()">Valid message</button>
			<button (click)="sendMalformed()">Malformed message</button>
			<button (click)="sendUnsupportedMessage()">Unsupported message</button>
			<button (click)="sendUnsupportedMajorVersion()">Unsupported major version</button>
			<button (click)="sendUnsupportedMinorVersion()">Unsupported minor version</button>
		</div>
	`,
	providers: [
		{
			provide: MESSAGE_PEER_CONFIG,
			useFactory: (idService: IdService) => {
				return {
					id: idService.next(),
					knownMessages: [{ type: 'resize', version: '1.1' }],
				} as MessagePeerConfig;
			},
			deps: [IdService],
		},
		MessagePeerService,
	],
})
export class ClientComponent {
	client: MessagePeerService<MyMessage> = inject(MessagePeerService);

	constructor() {
		this.client.connect('host');

		this.client.messages$
			.pipe(takeUntilDestroyed())
			.subscribe((message) => console.log(`Client '${this.client.id}' received:`, message));
	}

	sendValid() {
		this.client.send({
			type: 'resize',
			version: '1.1',
			height: 100,
		});
	}

	sendMalformed() {
		this.client.send({
			type: 'resize',
		} as unknown as MyMessage);
	}

	sendUnsupportedMessage() {
		this.client.send({
			type: 'unsupported',
			version: '1.1',
		} as unknown as MyMessage);
	}

	sendUnsupportedMajorVersion() {
		this.client.send({
			type: 'resize',
			version: '2.0',
			height: 100,
		} as unknown as MyMessage);
	}

	sendUnsupportedMinorVersion() {
		this.client.send({
			type: 'resize',
			version: '1.0',
			height: 100,
		} as unknown as MyMessage);
	}
}
