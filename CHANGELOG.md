# [0.0.5](https://github.com/AmadeusITGroup/microfrontends/compare/0.0.4...0.0.5) (2025-04-03)

New `.messages`, `.serviceMessages` and `.errors` API that make it easier to dissociate peer creation with and places where messages might be consumed. It uses `Obsevable` and `rxjs` compatible implementation for streams of messages.

### Features

- Introduce new APIs for message consumption ([1216d49](https://github.com/AmadeusITGroup/microfrontends/pull/19/commits/1216d490c45772c396233430e4fd22d9b4b4b7f5))

### Fixes

- Throw an error if provided origin is invalid in `.connect()` or `.listen()` calls ([db062bf](https://github.com/AmadeusITGroup/microfrontends/commit/db062bf2c4376b1a2078512518cc05d86417d6f6))

### BREAKING CHANGES

- No longer possible to get messages via `onMessage`, `onServiceMessage` and `onError`at construction time, one should use`.messages`, `.serviceMessages` and `.errors` subscribable streams:

```ts
// BEFORE
const peer = new MessagePeer({
  id: 'one',
  onMessage: (m) => {},
  onServiceMessage: (m) => {},
  onError: (e) => {},
});

// AFTER
const peer = new MessagePeer({ id: 'one' });

peer.messages.subscribe((m) => {});
peer.serviceMessages.subscribe((m) => {});
peer.errors.subscribe((e) => {});
```

# [0.0.4](https://github.com/AmadeusITGroup/microfrontends/compare/0.0.3...0.0.4) (2025-03-14)

### Features

- Exception during message validation upon reception now reported back to original sender via `ErrorMessage` ([db468df](https://github.com/AmadeusITGroup/microfrontends/commit/db468dfb4993b6c27feaf2ac94caa6a02d41d639))

### Fixes

- Messages `.send()` before connection is established are now cached and sent after connection is established ([8e6b7cf](https://github.com/AmadeusITGroup/microfrontends/commit/8e6b7cfb1d6694c51c62b4031802bfc9091b29a9))
- Fixed throwing errors when receiving a `postMessage` from 3rd party libraries ([bb41141
  ](https://github.com/AmadeusITGroup/microfrontends/commit/bb4114151cf0fedb2f8b49e72a71e6ddc207cc65))
- `ConnectMessage` now is sent before any queued user messages, not after ([d02ef3d
  ](https://github.com/AmadeusITGroup/microfrontends/commit/d02ef3d80d67a25f7e1ccb3385d9cfd3dc65af4b))

# [0.0.3](https://github.com/AmadeusITGroup/microfrontends/compare/0.0.2...0.0.3) (2025-03-03)

### Features

- Publish CommonJS, ESM and minified bundle ([c3a84f9](https://github.com/AmadeusITGroup/microfrontends/commit/c3a84f910d2655e719289336cd495383a95f3e20))
- Add `enableLogging()` method to configure debugging logging that is off by default([b81ad27](https://github.com/AmadeusITGroup/microfrontends/commit/b81ad27ba1410a3ef566422463a88e6a8961bb19))

### BREAKING CHANGES

- Service messages like `ConnectMessage`, `DisconnectMessage` have their own callback now:

```ts
// Before
let peer = new MessagePeer<M>({
  onMessage: (m: M) => {}, // both user and service messages
});

// After
let peer = new MessagePeer<M>({
  onMessage: (m: M) => {}, // only user messages
  onServiceMessage: (m: ServiceMessage) => {}, // only service messages
});
```
