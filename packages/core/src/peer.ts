import { Endpoint, EndpointType } from './endpoint';
import { ErrorMessage, isServiceMessage, Message, RoutedMessage, ServiceMessage } from './message';
import { MessageError } from './message-error';
import { logger } from './utils';
import { MessageCheck, PEER_MESSAGE_CHECKS } from './checks';

/**
 * Options to establish peer connection.
 * Useful to connect to a different window or an iframe.
 */
export interface PeerConnectionOptions {
	/**
	 * Window object peer should connect to or listen connections on.
	 * Default is `window` object of the current environment.
	 * It can be used to connect to a different window or an iframe.
	 */
	window?: Window;
	/**
	 * Origin of the window object peer should connect to or listen connections on.
	 * Default is `window.origin` of the current environment.
	 * Used to verify that the connection is established with the correct window from different origin.
	 */
	origin?: string;
}

/**
 * Options to pass when sending a message to the network.
 */
export interface PeerSendOptions {
	/**
	 * List of peer ids that should receive the message.
	 * If not provided or an empty array, the message will be received by all connected peers.
	 */
	to?: string | string[];
}

const DEFAULT_START_OPTIONS: Required<PeerConnectionOptions> = {
	window,
	origin: window.origin,
};

/**
 * Options to pass when creating a new peer.
 * The only required option is the unique `id` of the peer.
 */
export interface PeerOptions<M extends Message> {
	/**
	 * Unique identifier of the peer on the network it will be connected to
	 */
	id: string;
	/**
	 * List of known messages that the peer can receive, it can be amended later with {@link MessagePeerType#registerMessage()} method
	 */
	knownMessages?: Message[];
	/**
	 * Callback that is called when a new message is received by the peer.
	 * It can be a {@link ServiceMessage} like `connect` or `disconnect` or a custom user message.
	 * @param message - received message
	 */
	onMessage?: (message: RoutedMessage<M>) => void;
	/**
	 * Callback that is called when an error occurs during received message processing locally.
	 * The {@link ErrorMessage} will be sent back to the sender of the message automatically.
	 * @param error - error that occurred
	 */
	onError?: (error: MessageError) => void;
}

/**
 * A type that represents a peer in the network that can send and receive messages.
 */
export interface MessagePeerType<M extends Message> {
	/**
	 * Unique identifier of the peer on the network
	 */
	get id(): string;

	/**
	 * List of other known peers on the network and types of messages they can receive
	 */
	get knownPeers(): Map<string, Message[]>;

	/**
	 * Connects to the peer with the given id
	 * @param peerId - id of the peer we're connecting to
	 * @param options - additional {@link PeerConnectionOptions} options for the connection
	 * @returns a function that can be called to disconnect this peer from the network
	 */
	connect(peerId: string, options?: PeerConnectionOptions): Promise<() => void>;

	/**
	 * Listens for incoming connections from the peer with the given id
	 * @param peerId - id of the peer we're listening for
	 * @param options - additional {@link PeerConnectionOptions} for the connection
	 * @returns a function that can be called to disconnect this peer from the network*
	 */
	listen(peerId: string, options?: PeerConnectionOptions): Promise<() => void>;

	/**
	 * Sends a message to the network.
	 *
	 * Message must be a serializable object supported by `structuredClone()` algorithm.
	 * Message send can happen synchronously or asynchronously depending on how the peer is connected.
	 * By default, the message is broadcast to all connected peers.
	 * If you need to send a message to a specific peer only, use {@link PeerSendOptions#to} option.
	 * @param message - message to send
	 * @param options - additional {@link PeerSendOptions} for the message delivery
	 */
	send(message: M, options?: PeerSendOptions): void;

	/**
	 * Registers a new message that this peer can receive.
	 * @param message - message type and version to register
	 */
	registerMessage(message: Message): void;

	/**
	 * Disconnects this peer from the network completely or from a particular peer.
	 * If no `peerId` is provided, disconnects completely from the network.
	 * @param peerId - a specific peer id to disconnect from
	 */
	disconnect(peerId?: string): void;
}

/**
 * Default message peer that can send and receive messages to/from other peers in the same document
 * or across different windows or iframes.
 *
 * Messages will be sent in a synchronous way if both peers are in the same window.
 * Otherwise, a `MessageChannel` will be established to send messages between different windows.
 *
 * ```ts
 * // Simple example of creating two peers and sending messages between them
 * const one = new MessagePeer({ id: 'one', onMessage: (message) => {} });
 * const two = new MessagePeer({ id: 'two', onMessage: (message) => {} });
 *
 * // connecting two peers
 * one.listen('two');
 * two.connect('one');
 *
 * // sending messages
 * one.send({ type: 'ping', version: '1.0' }); // broadcast
 * two.send({ type: 'pong', version: '1.0' }, { to: 'one' }); // send to a specific peer
 *
 * // learning about the network
 * one.knownPeers; // lists all known peers and messages they can receive
 *
 * // disconnecting
 * one.disconnect(); // disconnects from all peers
 * one.disconnect('two'); // disconnects from a specific peer
 * ```
 */
export class MessagePeer<M extends Message> implements MessagePeerType<M> {
	readonly #id: string;
	readonly #endpoints = new Map<string, EndpointType<M>>();
	readonly #endpointPeers = new Map<string, Set<string>>();

	readonly #onMessage: PeerOptions<M>['onMessage'] | null = null;
	readonly #onError: PeerOptions<M>['onError'] | null = null;

	readonly #messageChecks: MessageCheck<M>[] = [...PEER_MESSAGE_CHECKS];
	readonly #knownPeers = new Map<string, Message[]>();

	constructor(options: PeerOptions<M>) {
		this.#id = options.id;
		this.#onMessage = options?.onMessage;
		this.#onError = options?.onError || ((error) => console.error(error, error.messageObject));

		this.#knownPeers.set(this.id, []);

		if (options.knownMessages) {
			for (const message of options.knownMessages) {
				this.registerMessage(message);
			}
		}

		logger(`PEER(${this.id}): created`, this.#knownPeers);
	}

	/**
	 * @inheritDoc
	 */
	public get id() {
		return this.#id;
	}

	/**
	 * @inheritDoc
	 */
	public get knownPeers(): Map<string, Message[]> {
		return this.#knownPeers;
	}

	/**
	 * @inheritDoc
	 */
	public connect(peerId: string, options?: PeerConnectionOptions) {
		logger(`PEER(${this.id}): connecting to '${peerId}'`);
		const endpoint = new Endpoint<M>(this.id);
		this.#endpoints.set(peerId, endpoint);

		return endpoint.connect(peerId, {
			...DEFAULT_START_OPTIONS,
			...options,
			knownPeers: this.#knownPeers,
			onMessage: (message) => this.#handleEndpointMessage(endpoint, message),
			onError: (error: MessageError) => this.#handleEndpointError(endpoint, error),
		});
	}

	/**
	 * @inheritDoc
	 */
	public send(message: M, options?: PeerSendOptions) {
		this.#send(message, options);
	}

	/**
	 * @inheritDoc
	 */
	public listen(peerId: string, options?: PeerConnectionOptions) {
		logger(`PEER(${this.id}): listening for '${peerId}'`);
		const endpoint = new Endpoint<M>(this.id);
		this.#endpoints.set(peerId, endpoint);

		return endpoint.listen(peerId, {
			...DEFAULT_START_OPTIONS,
			...options,
			knownPeers: this.#knownPeers,
			onMessage: (message) => this.#handleEndpointMessage(endpoint, message),
			onError: (error: MessageError) => this.#handleEndpointError(endpoint, error),
		});
	}

	/**
	 * @inheritDoc
	 */
	public registerMessage(message: Message) {
		const knownMessages = this.#knownPeers.get(this.id)!;
		if (!knownMessages.find((m) => m.type === message.type && m.version === message.version)) {
			knownMessages.push(message);
		}
	}

	/**
	 * Logs the current state of the peer to the console
	 */
	public log() {
		const endpoints = [...this.#endpoints.values()].map(
			(e) => `${e.id}:${e.connected ? e.remoteId : e.remoteId + '*'}`,
		);
		const endpointPeers = [...this.#endpointPeers].map(
			([id, peers]) => `${id}: ${[...peers].join(', ')}`,
		);
		console.log(`PEER(${this.id}):`, endpoints, endpointPeers, this.#knownPeers);
	}

	/**
	 * @inheritDoc
	 */
	public disconnect(peerId?: string) {
		if (peerId) {
			const endpoint = this.#endpoints.get(peerId);
			if (endpoint) {
				this.#disconnectEndpoint(endpoint);
			}
		} else {
			for (const endpoint of this.#endpoints.values()) {
				this.#disconnectEndpoint(endpoint);
			}
		}
	}

	/**
	 * Disconnect from a particular endpoint
	 * @param endpoint - endpoint to disconnect from
	 */
	#disconnectEndpoint(endpoint: EndpointType<M>) {
		const remoteId = endpoint.remoteId!;

		// 0. collecting all peers that will be disconnected
		const disconnectedPeers = [...(this.#endpointPeers.get(remoteId) || [])];
		const unreachable = [this.id];
		for (const [peerId, peers] of this.#endpointPeers) {
			if (peerId !== remoteId) {
				unreachable.push(...peers);
			}
		}

		// 1. notify the other side that WE will disconnect
		if (endpoint.connected) {
			endpoint.send({
				from: this.id,
				to: [],
				payload: {
					type: 'disconnect',
					version: '1.0',
					disconnected: this.id,
					unreachable,
				},
			});
		}

		// 2. physically disconnecting
		this.#endpointPeers.delete(remoteId);
		for (const id of disconnectedPeers) {
			this.#knownPeers.delete(id);
		}
		this.#endpoints.delete(remoteId);
		endpoint.disconnect();

		// 3. notify all other endpoints about the disconnection
		this.#send({
			type: 'disconnect',
			version: '1.0',
			disconnected: remoteId,
			unreachable: disconnectedPeers,
		});

		logger(`PEER(${this.id}): disconnected from '${remoteId}'`, this.#endpoints, this.#knownPeers);
	}

	#handleEndpointError(endpoint: EndpointType<M | ErrorMessage>, error: MessageError) {
		this.#onError?.(error);

		// TODO: implement error handling
		// sending back to the endpoint we got it from
		// endpoint.send({
		//   from: this.id,
		//   to: [error.messageObject.from || endpoint.remoteId || '?'],
		//   payload: {
		//     type: 'error',
		//     version: '1.0',
		//     error: error.message,
		//     message: error.messageObject
		//   }
		// });
	}

	/**
	 * Processes the message received form a particular endpoint.
	 * In the end it can either notify the user about the message or forward it to other endpoints.
	 * @param endpoint - endpoint that sent the message
	 * @param message - message to process
	 */
	#handleEndpointMessage(endpoint: EndpointType<M>, message: RoutedMessage<M>) {
		logger(`PEER(${this.id}): received message`, message, this.#knownPeers);
		const { payload } = message;

		// handle service messages
		if (isServiceMessage(payload)) {
			switch (payload.type) {
				case 'handshake': {
					logger(`PEER(${this.id}): handshake message from '${payload.remoteId}'`, payload);
					const connected = [...this.knownPeers.keys()];

					// 1. registering the new endpoint and its messages
					for (const [id, messages] of payload.knownPeers) {
						this.#registerRemoteMessages(id, messages);
					}
					this.#endpointPeers.set(payload.remoteId, new Set(payload.knownPeers.keys()));

					// 2. notifying all other endpoints that new endpoint is connected
					for (const e of this.#endpoints.values()) {
						if (e !== endpoint && e.connected) {
							e.send({
								from: this.id,
								to: [],
								payload: {
									type: 'connect',
									version: '1.0',
									knownPeers: this.#knownPeers,
									connected: [...payload.knownPeers.keys()],
								},
							});
						}
					}

					// 3. notifying the new endpoint about all other previously connected endpoints
					endpoint.send({
						from: this.id,
						to: [payload.remoteId],
						payload: {
							type: 'connect',
							version: '1.0',
							knownPeers: new Map(), // TODO: not sure this is OK
							connected,
						},
					});
					break;
				}

				case 'connect': {
					// only process the message if it's addressed to us, forward otherwise
					if (message.to.includes(this.id) || message.to.length === 0) {
						logger(`PEER(${this.id}): connect message from '${endpoint.remoteId}'`, payload);

						// 1. registering new messages
						for (const [id, messages] of payload.knownPeers) {
							this.#registerRemoteMessages(id, messages);
						}

						// 2. updating the list of known peers
						const knownPeers = this.#endpointPeers.get(endpoint.remoteId!)!;
						for (const id of payload.knownPeers.keys()) {
							if (id === this.id || [...this.#endpoints.keys()].includes(id)) {
								continue;
							}
							knownPeers.add(id);
						}

						// 3. passing the message to the user
						this.#onMessage?.({ ...message, payload: { ...payload, knownPeers: [] } });
					}
					this.#forwardMessage(endpoint, message);
					break;
				}

				case 'disconnect': {
					logger(`PEER(${this.id}): disconnect message from '${endpoint.remoteId}'`, payload);

					// 1. disconnecting the endpoint
					const endpointToDisconnect = this.#endpoints.get(payload.disconnected);
					if (endpointToDisconnect) {
						endpoint.disconnect();
					}

					// 2. removing all unreachable peers and endpoints
					for (const id of payload.unreachable) {
						this.#knownPeers.delete(id);
						this.#endpoints.delete(id);

						for (const [peerId, peers] of this.#endpointPeers) {
							peers.delete(id);
							if (peers.size === 0) {
								this.#endpointPeers.delete(peerId);
							}
						}
					}

					// 3. passing the message to the user and further on the network
					this.#onMessage?.(message);
					this.#forwardMessage(endpoint, message);
					break;
				}

				case 'declare_messages': {
					logger(`PEER(${this.id}): declare_messages from '${message.from}'`, payload);
					this.#registerRemoteMessages(message.from, payload.messages);
					this.#onMessage?.(message);
					this.#forwardMessage(endpoint, message);
					break;
				}

				default: {
					logger(`PEER(${this.id}):`, `unknown message type: ${payload.type}`);
					this.#handleEndpointError(
						endpoint,
						new MessageError(message, `unknown message type: ${payload.type}`),
					);
				}
			}
		}

		// handling user messages, processing errors and forwarding the message further if necessary
		else {
			try {
				if (message.to.includes(this.id) || message.to.length === 0) {
					for (const { check } of this.#messageChecks) {
						check(message, this);
					}
					logger(`PEER(${this.id}): message validated`, message);
					this.#onMessage?.(message);
				}
			} catch (error) {
				logger(`PEER(${this.id}):`, error);
				this.#handleEndpointError(endpoint, error as MessageError);
			} finally {
				this.#forwardMessage(endpoint, message);
			}
		}
	}

	/**
	 * Sends a message `M` or {@link ServiceMessage} to the network.
	 * @param payload - message to send
	 * @param options - additional {@link PeerSendOptions} for the message delivery
	 */
	#send(payload: M | ServiceMessage, options?: PeerSendOptions) {
		const routedMessage: RoutedMessage<M | ServiceMessage> = {
			from: this.id,
			to: options?.to ? (Array.isArray(options.to) ? options.to : [options.to]) : [],
			payload,
		};
		for (const endpoint of this.#endpoints.values()) {
			endpoint.send(routedMessage);
		}
	}

	/**
	 * Forwards the message to all other endpoints except the receivedFrom.
	 * @param receivedFrom - endpoint that should not receive the message, we just got the message from it
	 * @param message - message to forward
	 */
	#forwardMessage(receivedFrom: EndpointType<M | ServiceMessage>, message: RoutedMessage<M>) {
		// we're the only recipient for the message -> no need to forward
		if (message.to.length === 1 && message.to[0] === this.id) {
			return;
		}
		// forwarding the message to all other endpoints
		for (const e of this.#endpoints.values()) {
			if (e !== receivedFrom && e.connected) {
				e.send(message);
			}
		}
	}

	/**
	 * Registers messages that the remote peer can receive.
	 * @param peerId - id of the peer that can receive the messages
	 * @param messages - list of messages the peer can receive
	 */
	#registerRemoteMessages(peerId: string, messages: Message[]) {
		if (this.id !== peerId) {
			const knownMessages = this.#knownPeers.get(peerId);
			if (!knownMessages) {
				this.#knownPeers.set(peerId, messages);
			} else {
				for (const message of messages) {
					if (
						!knownMessages.find((m) => m.type === message.type && m.version === message.version)
					) {
						knownMessages.push(message);
					}
				}
			}
		}
	}
}
