# Micro Frontends

This repository contains tools for developing micro frontend applications. Please refer to the documentation for the specific packages for more information.

## Published packages

| NPM Package                                | Source Code        | Documentation                             |
| ------------------------------------------ | ------------------ | ----------------------------------------- |
| `@amadeus-it-group/microfrontends`         | `packages/core`    | [README.md](./packages/core/README.md)    |
| `@amadeus-it-group/microfrontends-angular` | `packages/angular` | [README.md](./packages/angular/README.md) |

## Getting Started

Simply run `npm install` after cloning the repository.

Useful commands:

- `npm run build` to build all packages
- `npm run test` to run all tests
- `npm run lint` to lint all packages
- `npm run demo` to launch the demo application

## Workspaces

| Workspace           | Description                         |
| ------------------- | ----------------------------------- |
| `packages/core`     | The core library                    |
| `packages/core-e2e` | E2E test cases for the core library |
| `packages/angular`  | Angular wrappers and specific tools |
| `demos/app-angular` | Small Angular demo application      |
