import { Component } from '@angular/core';
import { Host } from './host';
import { Client } from './client';

@Component({
	selector: 'app-root',
	template: `
		<h1>SSR Test App</h1>
		<app-host />
		<app-client />
	`,
	imports: [Host, Client],
})
export class App {}
