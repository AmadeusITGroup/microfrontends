import { Component, inject, Injector } from '@angular/core';
import {
	MESSAGE_PEER_CONFIG,
	MESSAGE_PEER_CONNECT_OPTIONS,
	MESSAGE_PEER_LISTEN_OPTIONS,
	MessagePeerConfig,
	MessagePeerService,
	MessagePeerServiceType,
} from './message-peer.service';
import type { Message, PeerConnectionOptions } from '@amadeus-it-group/microfrontends';
import { MessagePeer } from '@amadeus-it-group/microfrontends';
import { TestBed } from '@angular/core/testing';

describe('MessagePeerService', () => {
	let service: MessagePeerServiceType<Message>;
	const config: MessagePeerConfig = { id: 'test-peer' };

	beforeEach(() => {
		service = Injector.create({
			providers: [MessagePeerService, { provide: MESSAGE_PEER_CONFIG, useValue: config }],
		}).get(MessagePeerService);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	test('should be created', () => {
		expect(service).toBeTruthy();
	});

	test('should have the correct id', () => {
		expect(service.id).toBe(config.id);
	});

	test('should register a message', () => {
		const message = { type: 'new', version: '1.0' };
		service.registerMessage(message);
		expect(service.knownPeers.get(config.id)).toContain(message);
	});

	test('should send a message', () => {
		const message = { type: 'new', version: '1.0' };
		const sendSpy = jest.spyOn(MessagePeer.prototype, 'send').mockImplementation();
		service.send(message);
		expect(sendSpy).toHaveBeenCalledWith(message, undefined);
	});

	test('should listen for messages', () => {
		const peerId = 'peer-id';
		const listenSpy = jest.spyOn(MessagePeer.prototype, 'listen').mockImplementation();
		service.listen(peerId);
		expect(listenSpy).toHaveBeenCalledWith(peerId);
	});

	test('should connect to a peer', async () => {
		const peerId = 'peer-id';
		const connectSpy = jest.spyOn(MessagePeer.prototype, 'connect').mockImplementation();
		await service.connect(peerId);
		expect(connectSpy).toHaveBeenCalledWith(peerId, undefined);
	});

	test('should disconnect from a peer', () => {
		const peerId = 'peer-id';
		const disconnectSpy = jest.spyOn(MessagePeer.prototype, 'disconnect').mockImplementation();
		service.disconnect(peerId);
		expect(disconnectSpy).toHaveBeenCalledWith(peerId);
	});
});

describe('MessagePeerService Interactions', () => {
	const knownMessages: Message[] = [{ type: 'test', version: '1.0' }];

	let s1: MessagePeerServiceType<any>;
	let s2: MessagePeerServiceType<any>;

	beforeEach(() => {
		s1 = Injector.create({
			providers: [
				MessagePeerService,
				{
					provide: MESSAGE_PEER_CONFIG,
					useValue: { id: 's1', knownMessages, messageCheckStrategy: 'version' },
				},
			],
		}).get(MessagePeerService);

		s2 = Injector.create({
			providers: [
				MessagePeerService,
				{
					provide: MESSAGE_PEER_CONFIG,
					useValue: { id: 's2', knownMessages, messageCheckStrategy: 'version' },
				},
			],
		}).get(MessagePeerService);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	test('should connect and exchange messages and errors', () => {
		const messages: any[] = [];
		const serviceMessages: any[] = [];
		const errors: any[] = [];
		s2.messages$.subscribe(({ payload }) =>
			messages.push({ type: payload.type, version: payload.version }),
		);
		s2.serviceMessages$.subscribe(({ payload }) =>
			serviceMessages.push({ type: payload.type, version: payload.version }),
		);
		s2.errors$.subscribe((error) => errors.push(error.message));

		s1.listen('s2');
		s2.connect('s1');

		s1.send({ type: 'test', version: '1.0' });
		s1.send({ type: 'test', version: '2.0' });

		expect(messages).toEqual([{ type: 'test', version: '1.0' }]);
		expect(serviceMessages).toEqual([
			{ type: 'handshake', version: '1.0' },
			{ type: 'connect', version: '1.0' },
		]);
		expect(errors).toEqual(['Unknown message version "2.0". Known versions: ["1.0"]']);
	});
});

describe('MessagePeerService destruction', () => {
	@Component({
		selector: 'lib-app1',
		template: '',
		providers: [MessagePeerService, { provide: MESSAGE_PEER_CONFIG, useValue: { id: 'app1' } }],
	})
	class App1Component {
		service = inject(MessagePeerService);
	}

	@Component({
		selector: 'lib-app2',
		template: '',
		providers: [MessagePeerService, { provide: MESSAGE_PEER_CONFIG, useValue: { id: 'app2' } }],
	})
	class App2Component {
		service = inject(MessagePeerService);
	}

	test('should disconnect and stop listening on destruction', () => {
		jest.spyOn(MessagePeerService.prototype, 'ngOnDestroy');
		jest.spyOn(MessagePeerService.prototype, 'disconnect');

		const app1 = TestBed.createComponent(App1Component);
		const { service: s1 } = app1.componentInstance;

		const app2 = TestBed.createComponent(App2Component);
		const { service: s2 } = app2.componentInstance;

		const messages: any[] = [];
		s2.serviceMessages$.subscribe(({ payload }) =>
			messages.push({ type: payload.type, version: payload.version }),
		);

		// connect and handshake
		s1.listen();
		s2.connect('app1');
		expect(messages).toEqual([
			{ type: 'handshake', version: '1.0' },
			{ type: 'connect', version: '1.0' },
		]);

		// destroy app1 -> disconnect
		messages.length = 0;
		app1.destroy();
		expect(messages).toEqual([{ type: 'disconnect', version: '1.0' }]);

		// try to connect again -> app1 stopped listening
		messages.length = 0;
		s2.connect('app1');
		expect(messages).toEqual([]);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});
});

describe('MessagePeerService DI overrides', () => {
	let connectSpy: jest.SpyInstance;
	let listenSpy: jest.SpyInstance;
	let injector: Injector;
	const knownMessages = [{ type: 'test', version: '1.0' }];

	const connectOptions: PeerConnectionOptions = {
		window: 'mocked connect window' as any,
		origin: 'mocked origin',
	};

	const listenOptions = ['one', 'two'];

	beforeEach(() => {
		connectSpy = jest.spyOn(MessagePeer.prototype, 'connect').mockImplementation();
		listenSpy = jest.spyOn(MessagePeer.prototype, 'listen').mockImplementation();

		injector = Injector.create({
			providers: [
				MessagePeerService,
				{ provide: MESSAGE_PEER_CONFIG, useValue: { id: 'blah', knownMessages } },
				{ provide: MESSAGE_PEER_CONNECT_OPTIONS, useValue: connectOptions },
				{ provide: MESSAGE_PEER_LISTEN_OPTIONS, useValue: listenOptions },
			],
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	test('should use the provided DI options', () => {
		const service = injector.get(MessagePeerService);

		// create options
		expect(service.id).toBe('blah');
		expect(service.knownPeers.get('blah')).toEqual([{ type: 'test', version: '1.0' }]);

		// connect options
		service.connect('A');
		service.listen('B');
		expect(connectSpy).toHaveBeenCalledWith('A', { ...connectOptions });
		expect(listenSpy).toHaveBeenCalledWith('B');

		service.connect('C', { origin: 'replaced' });
		service.listen();
		expect(connectSpy).toHaveBeenCalledWith('C', { ...connectOptions, origin: 'replaced' });
		expect(listenSpy).toHaveBeenCalledWith(listenOptions);
	});
});
