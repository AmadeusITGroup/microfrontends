import { Component, inject } from '@angular/core';
import { MyMessage } from './messages';
import { MessagePeerService } from '@amadeus-it-group/microfrontends-angular';

@Component({
	selector: 'one-host',
	standalone: true,
	template: `
		<h3>Host &rarr; Clients</h3>
		<div class="buttons">
			<button (click)="sendValid()">Valid message</button>
			<button (click)="sendMalformed()">Malformed message</button>
			<button (click)="sendUnsupportedMessage()">Unsupported message</button>
			<button (click)="sendUnsupportedMajorVersion()">Unsupported major version</button>
			<button (click)="sendUnsupportedMinorVersion()">Unsupported minor version</button>
		</div>
	`,
})
export class HostComponent {
	private host: MessagePeerService<MyMessage> = inject(MessagePeerService);

	constructor() {
		console.log(this.host);

		this.host.listen('client-1');
		this.host.listen('client-2');

		this.host.messages$.subscribe(({ payload }) => {
			switch (payload.type) {
				case 'resize':
					console.log('Resize ->', payload.height);
					break;
			}
		});
	}

	sendValid() {
		this.host.send({
			type: 'resize',
			version: '1.1',
			height: 100,
		});
	}

	sendMalformed() {
		this.host.send({
			type: 'resize',
		} as unknown as MyMessage);
	}

	sendUnsupportedMessage() {
		this.host.send({
			type: 'unsupported',
			version: '1.1',
		} as unknown as MyMessage);
	}

	sendUnsupportedMajorVersion() {
		this.host.send({
			type: 'resize',
			version: '2.0',
			height: 100,
		} as unknown as MyMessage);
	}

	sendUnsupportedMinorVersion() {
		this.host.send({
			type: 'resize',
			version: '1.0',
			height: 100,
		} as unknown as MyMessage);
	}
}
