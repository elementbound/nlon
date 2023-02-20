# nlon-websocket

WebSocket adapter for [NLON](https://github.com/elementbound/nlon).

Since NLON by itself is not concerned by the actual method of data transfer,
adapters can be used to apply the protocol over various media.

This package provides such an adapter for use with
[WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket).

Under the hood, this package uses `isomorphic-ws`, which delegates to either
`ws` or the browser's WebSocket implementation, depending on where it's used.

To see NLON running in the browser, see the [websocket-chat
example](../../examples/websocket-chat/).

## Install

Install with npm:

```bash
npm i @elementbound/nlon-websocket
```

## Usage

This package provides factory methods both for wrapping existing WebSockets or
creating new ones.

### Server

Wrap an existing server instance:

```js
import { wrapWebSocketServer } from '@elementbound/nlon-websocket'
import ws from 'isomorphic-ws'

const wss = new ws.WebSocketServer({
  host: 'localhost',
  port: 63636
})

const nlonServer = wrapWebSocketServer(wss)
```

Create a new WebSocket server and wrap in NLON:

```js
import { createWebSocketServer } from '@elementbound/nlon-websocket'

const nlonServer = createWebSocketServer({
  host: 'localhost',
  port: 63636
})
```

Access the `WebSocketServer` instance behind the NLON Server with
`nlonServer.server`.

> These only work in Node, no WebSocket server implementation is available in
> the browser.

### Peer

Wrap an existing socket:

```js
import { wrapWebSocketPeer } from '@elementb/nlon-websocket'
import ws from 'isomorphic-ws'

const ws = new WebSocket('ws://localhost:63636/')
const nlonPeer = wrapWebSocketPeer(ws)
```

Connect to WS server and wrap in NLON Peer:

```js
import { createWebSocketPeer } from '@elementb/nlon-websocket'

const nlonPeer = createWebSocketPeer({
  address: 'ws://localhost:63636/'
})
```

Access the `WebSocket` instance behind the NLON Peer with `nlonPeer.socket`.

## Documentation

To generate the reference documentation, run the following:

```js
npm run doc
```

The resulting docs will be under the `jsdoc` directory.

## License

This package is under the [MIT License](LICENSE).

