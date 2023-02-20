# websocket-chat

A basic example app using NLON over Websocket, powered by Express and Webpack.

## Usage

Checkout the repo and install dependencies by running the following in the
example's directory:

```sh
pnpm install
```

Once that's done, you can start the application:

```sh
pnpm start
```

This will build the frontend and launch the server. If you'd like to work on the
source, use the following:

```sh
pnpm run start:dev
```

This will watch the code for changes, rebuilding the frontend and restart the
server as needed.

With your server running, open <http://localhost:3000/> to see the app running.

## NLON in the browser

While NLON is not bound to any environment/runtime, the reference implementation
uses a few Node modules. To run this code in the browser, you need to provide
polyfills for those modules, see the [webpack config](webpack.config.mjs#L35) for
a list of modules and their polyfills.

The WebSocket adapter is isomorphic, so it can be used safely both from Node and
in the browser.

## License

This package is under the [MIT License](LICENSE).

