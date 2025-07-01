import type { HandshakeMessage, Message, RoutedMessage, ServiceMessage } from './message';
import { logger } from './utils';
import { LocalMessageChannel } from './local-message-channel';

/**
 * Low-level communication endpoint for sending and receiving messages.
 * Endpoint can connect to another endpoint, send and receive messages from it.
 *
 * It decides to use `MessageChannel` API for communication
 * or local {@link LocalMessageChannel} based on custom events
 */
export interface EndpointType<M extends Message> {
	readonly id: string;

	readonly remoteId: string;

	readonly connected: boolean;

	readonly connection: Promise<() => void>;

	resolve(disconnectFn: () => void): void;

	reject(reason: string): void;

	disconnect(): void;

	send(message: RoutedMessage<M | ServiceMessage>): void;
}

export class Endpoint<M extends Message> implements EndpointType<M> {
	readonly connection: Promise<() => void>;
	connected = false;
	readonly #messageQueue: RoutedMessage<M | ServiceMessage>[] = [];

	#resolve: (disconnectFn: () => void) => void = () => {
		// noop, will be set later
	};
	reject: (reason: string) => void = () => {
		// noop, will be set later
	};

	constructor(
		public readonly id: string,
		public readonly remoteId: string,
		public readonly port: MessagePort,
	) {
		this.connection = new Promise<() => void>((resolve, reject) => {
			this.#resolve = resolve;
			this.reject = reject;
		});
	}

	disconnect() {
		this.connected = false;
		this.port.close();
	}

	public resolve(disconnectFn: () => void): void {
		this.connected = true;
		this.#sendQueuedMessages();
		this.#resolve(disconnectFn);
	}

	public send(message: RoutedMessage<M | ServiceMessage>): void {
		if (this.connected && this.port) {
			logger(
				`EP(${this.id}): sending message '${message.payload.type}' to '${this.remoteId}':`,
				message,
			);
			this.port.postMessage(message);
		} else {
			logger(`EP(${this.id}): queueing message:`, message);
			// making sure we have a cloned message in case message contains references
			// and pushing connect message before in the queue
			if (message.payload.type === 'connect') {
				this.#messageQueue.unshift(structuredClone(message));
			} else {
				this.#messageQueue.push(structuredClone(message));
			}
		}
	}

	#sendQueuedMessages(): void {
		for (const message of this.#messageQueue) {
			this.send(message);
		}
		this.#messageQueue.length = 0;
	}
}

export class ConnectEndpoint<M extends Message> extends Endpoint<M> {
	readonly #remotePort: MessagePort;

	constructor(
		id: string,
		remoteId: string,
		private targetWindow: MessageEventSource,
		private readonly targetOrigin: string,
	) {
		// create a new message channel
		// same window -> simple LocalMessageChannel based on EventTarget
		// different windows -> real MessageChannel
		const { port1, port2 } =
			window === targetWindow ? new LocalMessageChannel() : new MessageChannel();

		super(id, remoteId, port1);

		this.#remotePort = port2;
	}

	sendHandshake(message: RoutedMessage<HandshakeMessage>): void {
		// Same window -> CustomEvent
		if (window === this.targetWindow) {
			logger(`EP(${this.id}): sending 'CustomEvent' handshake to '${this.remoteId}':`, message);
			window.dispatchEvent(
				new CustomEvent('handshake', {
					detail: {
						data: message,
						origin: this.targetOrigin,
						ports: [this.#remotePort],
					},
				}),
			);
		}
		// Different window -> postMessage
		else {
			logger(`EP(${this.id}): sending 'postMessage' handshake to '${this.remoteId}':`, message);
			this.targetWindow.postMessage(message, {
				targetOrigin: this.targetOrigin,
				transfer: [this.#remotePort],
			});
		}
	}
}
