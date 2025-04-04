import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
	selector: 'app-root',
	imports: [RouterOutlet, RouterLink],
	template: `
		<h1>Welcome!</h1>

		<ul>
			<li>
				<a routerLink="/one">One</a>
			</li>
		</ul>

		<router-outlet />
	`,
})
export class AppComponent {}
