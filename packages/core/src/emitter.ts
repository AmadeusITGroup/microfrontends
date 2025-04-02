declare global {
	interface SymbolConstructor {
		readonly observable: symbol;
	}
}

export type SubscriberFunction<T> = (value: T) => void;

export interface SubscriberObject<T> {
	next?: SubscriberFunction<T>;
}

export type Subscriber<T> = SubscriberObject<T> | SubscriberFunction<T> | null | undefined;

interface Subscription {
	unsubscribe(): void;
}

/**
 * An Observable-compatible interface for consuming messages.
 *
 * It can also be used with rxjs, for example:
 *
 * ```ts
 * import { from } from 'rxjs';
 *
 * const peer = new MessagePeer({...});
 * const observable = from(peer.messages);
 * ```
 */
export interface Subscribable<T> {
	[Symbol.observable](): Subscribable<T>;

	subscribe(subscriber: Subscriber<T>): Subscription;
}

const EMPTY_SUBSCRIPTION: Subscription = {
	unsubscribe: () => {
		// do nothing
	},
};

export class Emitter<T> implements Subscribable<T> {
	#subscribers = new Set<NonNullable<Subscriber<T>>>();

	get subscribers() {
		return this.#subscribers;
	}

	subscribe(subscriber: Subscriber<T>): Subscription {
		if (subscriber) {
			this.#subscribers.add(subscriber);
			return {
				unsubscribe: () => {
					this.#subscribers.delete(subscriber);
				},
			};
		} else {
			return EMPTY_SUBSCRIPTION;
		}
	}

	emit(value: T): void {
		for (const subscriber of this.#subscribers) {
			if (typeof subscriber === 'function') {
				subscriber(value);
			} else {
				subscriber.next?.(value);
			}
		}
	}

	[Symbol.observable](): Subscribable<T> {
		return this;
	}

	['@@observable'](): Subscribable<T> {
		return this;
	}
}
