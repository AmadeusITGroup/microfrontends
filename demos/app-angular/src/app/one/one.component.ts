import { Component } from '@angular/core';
import { HostComponent } from './host.component';
import { ClientComponent } from './client.component';

@Component({
	selector: 'name',
	standalone: true,
	imports: [HostComponent, ClientComponent],
	template: `
		<h1>One</h1>
		<one-host></one-host>
		<one-client></one-client>
		<one-client></one-client>
	`,
})
export default class OneComponent {}
