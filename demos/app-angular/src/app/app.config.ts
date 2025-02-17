import { ApplicationConfig, provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';

import { routes } from './app.routes';
import { MESSAGE_PEER_CONFIG, MessagePeerConfig } from '@amadeus-it-group/microfrontends-angular';

export const appConfig: ApplicationConfig = {
	providers: [
		{
			provide: MESSAGE_PEER_CONFIG,
			useValue: {
				id: 'host',
			} satisfies MessagePeerConfig,
		},
		provideExperimentalZonelessChangeDetection(),
		provideRouter(routes, withHashLocation()),
	],
};
