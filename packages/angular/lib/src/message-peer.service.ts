import {
	Message,
	MessageError,
	MessagePeer,
	MessagePeerType,
	PeerConnectionOptions,
	PeerOptions,
	PeerSendOptions,
	RoutedMessage,
	ServiceMessage,
} from '@amadeus-it-group/microfrontends';
import { from, Observable } from 'rxjs';
import { inject, Injectable, InjectionToken } from '@angular/core';

/**
 * Interface for the peer service that provides an observable for incoming messages
 */
export interface MessagePeerServiceType<M extends Message>
	extends Omit<MessagePeerType<M>, 'messages' | 'serviceMessages' | 'errors'> {
	/**
	 * Observable for incoming messages
	 */
	get messages$(): Observable<RoutedMessage<M>>;

	/**
	 * Observable for incoming service messages
	 */
	get serviceMessages$(): Observable<RoutedMessage<ServiceMessage>>;

	/**
	 * Observable for peer local errors when processing messages
	 */
	get errors$(): Observable<MessageError>;
}

/**
 * @inheritDoc
 */
export interface MessagePeerConfig extends PeerOptions {}

/**
 * Injection token for {@link MessagePeerConfig}, required for the {@link MessagePeerService} configuration.
 */
export const MESSAGE_PEER_CONFIG = new InjectionToken<MessagePeerConfig>('MESSAGE_PEER_CONFIG');

/**
 * Injection token for {@link PeerConnectionOptions} used as default options to pass to {@link MessagePeerService#connect}.
 */
export const MESSAGE_PEER_CONNECT_OPTIONS = new InjectionToken<PeerConnectionOptions>(
	'MESSAGE_PEER_CONNECT_OPTIONS',
);

/**
 * Injection token for {@link PeerConnectionOptions} used as default options to pass to {@link MessagePeerService#listen}.
 */
export const MESSAGE_PEER_LISTEN_OPTIONS = new InjectionToken<PeerConnectionOptions>(
	'MESSAGE_PEER_LISTEN_OPTIONS',
);

/**
 * Angular service that wraps {@link MessagePeer} and provides an observable for incoming messages and errors
 * It is essentially just a wrapper around {@link MessagePeer} that integrates with Angular's DI system.
 */
@Injectable({ providedIn: 'root' })
export class MessagePeerService<M extends Message> implements MessagePeerServiceType<M> {
	readonly #peer: MessagePeerType<M>;
	readonly #diConnectOptions = inject(MESSAGE_PEER_CONNECT_OPTIONS, { optional: true });
	readonly #diListenOptions = inject(MESSAGE_PEER_LISTEN_OPTIONS, { optional: true });
	/**
	 * @inheritDoc
	 */
	messages$: Observable<RoutedMessage<M>>;
	/**
	 * @inheritDoc
	 */
	serviceMessages$: Observable<RoutedMessage<ServiceMessage>>;
	/**
	 * @inheritDoc
	 */
	errors$: Observable<MessageError>;

	constructor() {
		const config = inject(MESSAGE_PEER_CONFIG);
		this.#peer = new MessagePeer<M>({
			id: config.id,
			knownMessages: config.knownMessages,
			messageCheckStrategy: config.messageCheckStrategy,
		});

		this.messages$ = from(this.#peer.messages);
		this.serviceMessages$ = from(this.#peer.serviceMessages);
		this.errors$ = from(this.#peer.errors);
	}

	/**
	 * @inheritDoc
	 */
	public get id(): string {
		return this.#peer.id;
	}

	/**
	 * @inheritDoc
	 */
	public get knownPeers(): Map<string, Message[]> {
		return this.#peer.knownPeers;
	}

	/**
	 * @inheritDoc
	 */
	public listen(peerId: string, options?: PeerConnectionOptions): Promise<() => void> {
		return this.#peer.listen(
			peerId,
			this.#diListenOptions ? { ...this.#diListenOptions, ...options } : options,
		);
	}

	/**
	 * @inheritDoc
	 */
	public connect(peerId: string, options?: PeerConnectionOptions): Promise<() => void> {
		return this.#peer.connect(
			peerId,
			this.#diConnectOptions ? { ...this.#diConnectOptions, ...options } : options,
		);
	}

	/**
	 * @inheritDoc
	 */
	public registerMessage(message: Message) {
		this.#peer.registerMessage(message);
	}

	/**
	 * @inheritDoc
	 */
	public send(message: M, options?: PeerSendOptions) {
		this.#peer.send(message, options);
	}

	/**
	 * @inheritDoc
	 */
	public disconnect(peerId?: string) {
		this.#peer.disconnect(peerId);
	}
}
