import { Routes } from '@angular/router';

export const routes: Routes = [
	{
		path: '',
		redirectTo: 'one',
		pathMatch: 'full',
	},
	{
		path: 'one',
		loadComponent: () => import('./one/one.component'),
	},
];
