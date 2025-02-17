import { Injectable } from '@angular/core';

@Injectable({
	providedIn: 'root',
})
export class IdService {
	#counter = 0;

	next() {
		return `client-${++this.#counter}`;
	}
}
