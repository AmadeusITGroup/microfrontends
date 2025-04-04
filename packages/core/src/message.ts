/**
 * A message that is sent between peers
 */
export interface Message {
	/**
	 * Message type
	 */
	type: string;

	/**
	 * Message version
	 */
	version?: string;
}

/**
 * A functional message wrapper that contains the message payload and the sender and receiver ids.
 * It is used to route messages between peers.
 */
export interface RoutedMessage<M extends Message> {
	/**
	 * Id of the sender peer
	 */
	from: string;
	/**
	 * Id of the receiver peer(s). If it is an empty array, the message is broadcasted to all peers.
	 */
	to: string[];
	/**
	 * Message payload - an actual {@link Message} subtype that is sent between peers
	 */
	payload: M;
}

/**
 * A service message that is sent when an error occurs during the message processing.
 * It will be routed back to the sender of the message when parsing/validation exception occurs
 * on the receiver side.
 */
export interface ErrorMessage extends Message {
	/**
	 * Message type
	 */
	type: 'error';
	/**
	 * Message version
	 */
	version: '1.0';
	/**
	 * Error message
	 */
	error: string;
	/**
	 * The original message that caused the error
	 */
	message: RoutedMessage<Message>;
}

/**
 * A service message that is sent when a new {@link MessagePeerType} connects to the network.
 * It contains the list of new peers and messages they can receive.
 */
export interface ConnectMessage extends Message {
	/**
	 * Message type
	 */
	type: 'connect';

	/**
	 * Message version
	 */
	version: '1.0';

	/**
	 * List of new peers and messages they receive
	 */
	knownPeers: Map<string, Message[]>;

	/**
	 * List of peers ids that have just connected to the network
	 */
	connected: string[];
}

/**
 * A service message that is sent when a {@link MessagePeerType} disconnects from the network.
 * It contains the list of peers that are unreachable from the disconnected peer.
 */
export interface DisconnectMessage extends Message {
	/**
	 * Message type
	 */
	type: 'disconnect';
	/**
	 * Message version
	 */
	version: '1.0';
	/**
	 * Id of the disconnected peer
	 */
	disconnected: string;
	/**
	 * List of peers that are not reachable anymore from the disconnected peer
	 */
	unreachable: string[];
}

/**
 * A service message that is sent when an {@link Endpoint} connects to another `Endpoint.
 * This message stays internal and not propagated to the end user.
 */
export interface HandshakeMessage extends Message {
	/**
	 * Message type
	 */
	type: 'handshake';
	/**
	 * Message version
	 */
	version: '1.0';
	/**
	 * Id of the endpoint that receives the message
	 */
	endpointId: string;
	/**
	 * Id of the endpoint that has sent the message
	 */
	remoteId: string;
	/**
	 * List of known peers and messages that remote endpoint knows about.
	 */
	knownPeers: Map<string, Message[]>;
}

/**
 * A service message that is sent by a {@link MessagePeerType} that starts accepting new message types.
 */
export interface DeclareMessages extends Message {
	/**
	 * Message type
	 */
	type: 'declare_messages';
	/**
	 * Message version
	 */
	version: '1.0';
	/**
	 * List of message types (type, version) that the sender of the messages accepts
	 */
	messages: Message[];
}

/**
 * A type that represents a service message that is used by the library to communicate between peers,
 * maintain the network and handle errors.
 */
export type ServiceMessage =
	| HandshakeMessage
	| DeclareMessages
	| ErrorMessage
	| DisconnectMessage
	| ConnectMessage;

/**
 * List of all service message types
 */
export const SERVICE_MESSAGE_TYPES: Record<ServiceMessage['type'], true> = {
	handshake: true,
	error: true,
	disconnect: true,
	declare_messages: true,
	connect: true,
};

/**
 * Checks if a particular message is a {@link ServiceMessage}, like `connect`, `disconnect`, `handshake`, etc.
 *
 * ```ts
 * // Example of usage
 * if (isServiceMessage(message)) {
 *  switch (message.type) {
 *    case 'connect':
 *    // handle connect message with narrowed type
 *    break;
 *  }
 * }
 * ```
 * @param message - Message to check
 */
export function isServiceMessage(message: Message): message is ServiceMessage {
	return SERVICE_MESSAGE_TYPES[message?.type as ServiceMessage['type']] !== undefined;
}
