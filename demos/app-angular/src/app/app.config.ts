import {
	ApplicationConfig,
	provideAppInitializer,
	provideExperimentalZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';

import { routes } from './app.routes';
import { MESSAGE_PEER_CONFIG, MessagePeerConfig } from '@amadeus-it-group/microfrontends-angular';
import { enableLogging } from '@amadeus-it-group/microfrontends';

export const appConfig: ApplicationConfig = {
	providers: [
		provideAppInitializer(() => {
			enableLogging(true);
		}),
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
