# nlon-websocket

WebSocket adapter for [nlon](https://github.com/elementbound/nlon).

Since nlon by itself is not concerned by the actual method of data transfer,
adapters can be used to apply the protocol over various media.

This package provides such an adapter for use with
[WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket).

Under the hood, this package uses `isomorphic-ws`, which delegates to either
`ws` or the browser's WebSocket implementation, depending on where it's used.

To see nlon running in the browser, see the [websocket-chat
example](../../examples/websocket-chat/).

## Install

- pnpm: `pnpm add @elementbound/nlon-websocket`
- npm: `npm i @elementbound/nlon-websocket`
- yarn: `yarn add @elementbound/nlon-websocket`

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

Create a new WebSocket server and wrap in nlon:

```js
import { createWebSocketServer } from '@elementbound/nlon-websocket'

const nlonServer = createWebSocketServer({
  host: 'localhost',
  port: 63636
})
```

Access the `WebSocketServer` instance behind the nlon Server with
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

Connect to WS server and wrap in nlon Peer:

```js
import { createWebSocketPeer } from '@elementb/nlon-websocket'

const nlonPeer = createWebSocketPeer({
  address: 'ws://localhost:63636/'
})
```

Access the `WebSocket` instance behind the nlon Peer with `nlonPeer.socket`.

## Documentation

- [API docs](https://elementbound.github.io/nlon/nlon-websocket/)
  - Or generate your own with `pnpm doc`

## License

This package is under the [MIT License](LICENSE).
