# Amadeus Micro Frontends Toolkit

Please read this document if you want to contribute to the project or simply run it locally.

## Getting Started

Simply run `npm install` after cloning the repository.

Useful global commands:

- `npm run build` to build all packages
- `npm run test` to run all tests
- `npm run lint` to lint all packages
- `npm run demo` to launch the demo application
- `npm run ci` to run all checks done in CI

For the commands available in different workspaces, please refer to the `package.json` of the workspace in question.

A couple of useful examples:

- `npm run -w packages/core-e2e tdd` to run e2e tests in watch mode for the core package
- `npm run -w packages/core test` to run unit tests for the core package
- etc.

| NPM Workspace       | Description                                   |
| ------------------- | --------------------------------------------- |
| `packages/core`     | The core library                              |
| `packages/core-e2e` | E2E test cases for the core library           |
| `packages/angular`  | Angular wrappers and framework specific tools |
| `demos/app-angular` | Small Angular demo application                |

## Reporting issues

Please use the `Bug Report` template and provide as much information as possible. Please fork [this StackBlitz](https://stackblitz.com/edit/amadeus-it-group-microfrontends) to reproduce the issue if possible.

## Final remarks

- Please follow the code style of the project
- Please run `npm run ci` before pushing your changes to check it locally
- `Prettier` and `ESLint` are used to enforce the code style, please make sure your IDE is configured to use them to avoid formatting issues.
- `Wireit` is used to set up task dependencies and caches. If something is not building/running first try `rm -rf **/wireit` in the project root to clean up caches.
