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
