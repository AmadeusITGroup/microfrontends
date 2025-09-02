import {
	ApplicationConfig,
	provideAppInitializer,
	provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';

import { routes } from './app.routes';
import { enableLogging } from '@amadeus-it-group/microfrontends';

export const appConfig: ApplicationConfig = {
	providers: [
		provideAppInitializer(() => {
			enableLogging();
		}),
		provideZonelessChangeDetection(),
		provideRouter(routes, withHashLocation()),
	],
};
