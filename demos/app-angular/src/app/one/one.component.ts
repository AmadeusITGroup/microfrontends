import { Component } from '@angular/core';
import { HostComponent } from './host.component';
import { ClientAngularComponent } from './client-angular.component';
import { ClientCoreComponent } from './client-core.component';

@Component({
	selector: 'name',
	imports: [HostComponent, ClientAngularComponent, ClientCoreComponent],
	template: `
		<h1>One</h1>
		<p>In this example one host is connected to two clients</p>
		<one-host></one-host>
		<one-client-angular></one-client-angular>
		<one-client-core></one-client-core>
	`,
})
export default class OneComponent {}
