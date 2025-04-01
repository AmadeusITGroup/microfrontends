import type { HandshakeMessage, Message, RoutedMessage, ServiceMessage } from './message';
import { checkMessageHasCorrectStructure, checkOriginIsValid, logger } from './utils';
import { MessageError } from './message-error';
import { LocalMessageChannel } from './local-message-channel';

// registering a custom event for handshake messages
declare global {
	interface WindowEventMap {
		handshake: CustomEvent<MessageEvent<RoutedMessage<never>>>;
	}
}

/**
 * Options for connecting to an endpoint
 */
export interface EndpointConnectionOptions<M extends Message> {
	knownPeers: Map<string, Message[]>;
	onMessage?: (message: RoutedMessage<M>) => void;
	onError?: (error: MessageError) => void;
	window?: Window;
	origin?: string;
}

/**
 * Low-level communication endpoint for sending and receiving messages.
 * Endpoint can connect to another endpoint, send and receive messages from it.
 *
 * It decides to use `MessageChannel` API for communication
 * or local {@link LocalMessageChannel} based on custom events
 */
export interface EndpointType<M extends Message> {
	readonly id: string;

	readonly connected: boolean;

	get remoteId(): string | null;

	listen(endpointId: string, options: EndpointConnectionOptions<M>): Promise<() => void>;

	connect(endpointId: string, options: EndpointConnectionOptions<M>): Promise<() => void>;

	disconnect(): void;

	send(message: RoutedMessage<M | ServiceMessage>): void;
}

type HandshakeEvent<M> =
	| MessageEvent<RoutedMessage<M & HandshakeMessage>>
	| CustomEvent<MessageEvent<RoutedMessage<M & HandshakeMessage>>>;

export class Endpoint<M extends Message> implements EndpointType<M> {
	// message channel
	#channel: MessageChannel | null = null;
	#port: MessagePort | null = null;
	#handshakeListener: ((handshakeEvent: HandshakeEvent<M>) => void) | null = null;
	#remoteId: string | null = null;

	// connection
	#connection: Promise<() => void> | null = null;
	#connected = false;
	readonly #messageQueue: RoutedMessage<M | ServiceMessage>[] = [];

	// message processing
	#onMessage: EndpointConnectionOptions<M>['onMessage'] | null = null;
	#onError: EndpointConnectionOptions<M>['onError'] | null = null;

	constructor(public readonly id: string) {}

	public listen(endpointId: string, options: EndpointConnectionOptions<M>): Promise<() => void> {
		const { hostOrigin, hostWindow } = this.#processStartOptions(options);
		this.#remoteId = endpointId;

		logger(`EP(${this.id}): waiting for connections from '${endpointId}' at ${hostOrigin}`);

		if (!this.#connection) {
			this.#connection = new Promise<() => void>((resolve) => {
				// Listening for handshake messages on our channel that match the target origin
				this.#handshakeListener = (handshakeEvent: HandshakeEvent<M>) => {
					let event;
					if (handshakeEvent instanceof CustomEvent) {
						event = handshakeEvent.detail;
						logger(`EP(${this.id}): received 'CustomEvent'`, handshakeEvent);
					} else {
						event = handshakeEvent;
						logger(`EP(${this.id}): received 'postMessage'`, handshakeEvent);
					}

					const { origin, ports, source } = event;
					const message = event.data;

					// only accept messages of:
					// - correct structure
					// - type 'handshake' with matching 'id' and 'remoteId'
					// - expected origin
					// - 'null' origin with expected source
					try {
						checkMessageHasCorrectStructure(message);

						const { payload } = message;
						if (
							payload.type === `handshake` &&
							payload.endpointId === this.id &&
							payload.remoteId === endpointId &&
							(origin === hostOrigin || (origin === 'null' && source === hostWindow))
						) {
							// if the other party has died and reconnecting
							// we need to disconnect first
							this.#port?.close();

							this.#port = ports[0];
							this.#remoteId = payload.remoteId;

							this.#port.onmessage = (event: MessageEvent<RoutedMessage<M>>) => {
								const message = event.data;
								logger(
									`EP(${this.id}): '${payload.type}' message received from '${this.#remoteId ?? '?'}':`,
									message,
								);
								this.#processMessage(message);
							};

							const handshake = this.#createHandshakeMessage(endpointId, options.knownPeers);
							logger(
								`EP(${this.id}): handshake received from '${endpointId}', sending handshake back`,
								handshake,
							);
							this.#onMessage?.(message);
							this.#port.postMessage(handshake);
							this.#connected = true;
							this.#sendQueuedMessages();
							resolve(() => this.disconnect());
						}
					} catch {
						// ignore invalid handshake message attempts
					}
				};
				window.addEventListener('message', this.#handshakeListener);
				window.addEventListener('handshake', this.#handshakeListener);
			});
		}

		return this.#connection;
	}

	public connect(endpointId: string, options: EndpointConnectionOptions<M>): Promise<() => void> {
		const { hostOrigin, hostWindow } = this.#processStartOptions(options);
		this.#remoteId = endpointId;

		logger(`EP(${this.id}): connecting to '${endpointId}' at ${hostOrigin}`);

		// client tries to establish connection with the server
		if (!this.#connection) {
			this.#connection = new Promise<() => void>((resolve, reject) => {
				// create a new message channel
				// same window -> simple LocalMessageChannel based on EventTarget
				// different windows -> real MessageChannel
				this.#channel = window === hostWindow ? new LocalMessageChannel() : new MessageChannel();
				this.#port = this.#channel.port1;

				// incoming message handling
				this.#port.onmessage = (event: MessageEvent<RoutedMessage<M & HandshakeMessage>>) => {
					const message = event.data;
					const payload = message.payload;
					logger(
						`EP(${this.id}): '${payload.type}' message received from '${this.#remoteId ?? '?'}':`,
						message,
					);

					// Connected
					if (this.#connected) {
						this.#processMessage(message);
					}

					// Not connected yet, expecting handshake
					else if (payload.type === 'handshake') {
						if (payload.endpointId === this.id && payload.remoteId === endpointId) {
							this.#remoteId = payload.remoteId;
							logger(`EP(${this.id}): handshake received from ${this.remoteId}:`, hostOrigin);
							this.#onMessage?.(message);
							this.#connected = true;
							this.#sendQueuedMessages();
							resolve(() => this.disconnect());
						}
					} else {
						logger(`EP(${this.id}): handshake was expected, got:`, message);
						reject(`Handshake was expected, got: ${JSON.stringify(message)}`);
					}
				};

				// Send handshake message to the host window
				const handshake = this.#createHandshakeMessage(endpointId, options.knownPeers);

				// Same window -> CustomEvent
				if (window === hostWindow) {
					const message = { data: handshake, origin: hostOrigin, ports: [this.#channel.port2] };
					logger(`EP(${this.id}): sending 'CustomEvent' handshake to '${endpointId}':`, handshake);
					window.dispatchEvent(new CustomEvent('handshake', { detail: message }));
				}
				// Different window -> postMessage
				else {
					logger(`EP(${this.id}): sending 'postMessage' handshake to '${endpointId}':`, handshake);
					hostWindow.postMessage(handshake, {
						targetOrigin: hostOrigin,
						transfer: [this.#channel.port2],
					});
				}
			});
		}

		return this.#connection;
	}

	public get connected(): boolean {
		return this.#connected;
	}

	public get remoteId(): string | null {
		return this.#remoteId;
	}

	public disconnect(): void {
		this.#remoteId = null;
		this.#onMessage = null;
		this.#onError = null;
		this.#connection = null;
		this.#connected = false;
		this.#port?.close();
		this.#port = null;
		this.#channel = null;
		window.removeEventListener('message', this.#handshakeListener!);
		window.removeEventListener('handshake', this.#handshakeListener!);
		this.#handshakeListener = null;
	}

	public send(message: RoutedMessage<M | ServiceMessage>): void {
		if (this.#connected && this.#port) {
			logger(
				`EP(${this.id}): sending message '${message.payload.type}' to '${this.#remoteId}':`,
				message,
			);
			this.#port.postMessage(message);
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

	#processStartOptions(options?: EndpointConnectionOptions<M>) {
		// window
		const hostWindow = options?.window || window;
		const hostOrigin = options?.origin || window.origin;

		// throw error if origin is not valid
		checkOriginIsValid(hostOrigin);

		// messageHandling
		this.#onMessage = options?.onMessage;
		this.#onError = options?.onError || ((error) => console.warn(error));

		return { hostOrigin, hostWindow };
	}

	#createHandshakeMessage(
		endpointId: string,
		knownPeers: Map<string, Message[]>,
	): RoutedMessage<HandshakeMessage> {
		return {
			from: this.id,
			to: [endpointId],
			payload: {
				type: 'handshake',
				version: '1.0',
				endpointId,
				remoteId: this.id,
				knownPeers: new Map(knownPeers),
			},
		};
	}

	#processMessage(message: RoutedMessage<M>) {
		// TODO: maybe just do all this at the peer level?
		try {
			// validating incoming message structure
			checkMessageHasCorrectStructure(message);

			if (message.payload.type === 'handshake') {
				// TODO: what if we receive handshake, throw error ?
				console.warn(`EP(${this.id}): Unexpected handshake message received:`, message);
			} else {
				this.#onMessage?.(message);
			}
		} catch (error) {
			logger(`EP(${this.id}):`, error);
			this.#onError?.(error as MessageError);
		}
	}

	#sendQueuedMessages(): void {
		for (const message of this.#messageQueue) {
			this.send(message);
		}
		this.#messageQueue.length = 0;
	}
}
