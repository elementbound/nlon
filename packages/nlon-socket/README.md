# nlon-socket

Socket adapter for [NLON](https://github.com/elementbound/nlon).

Since NLON by itself is not concerned by the actual method of data transfer,
adapters can be used to apply the protocol over various media.

This package provides such an adapter for use with Node's
[sockets](https://nodejs.org/api/net.html).

## Install

- pnpm: `pnpm add @elementbound/nlon-socket`
- npm: `npm i @elementbound/nlon-socket`
- yarn: `yarn add @elementbound/nlon-socket`

## Usage

The package provides factory methods to either wrap an existing socket or create
a new one and add NLON on top of it.

### Server

```js
import { createSocketServer, wrapSocketServer } from '@elementbound/nlon-socket'
import net from 'node:net'

// Wrap an existing instance
const netServer = net.createServer(...)
const nlonServer = wrapSocketServer(netServer)
netServer.listen() // This must be called manually when wrapping

// Create a socket and start listening on it
// You can pass options for both the socket and NLON server
const nlonServer = createSocketServer({
  host: 'localhost',
  port: 63636
})

// Access wrapped net.Server instance
nlonServer.server
```

### Peer

```js
import { createSocketPeer, wrapSocketPeer }
import net from 'node:net'

// Wrap an existing instance
const socket = net.createConnection(...)
const nlonPeer = wrapSocketPeer(socket)

// Connect to host and initialize peer
const nlonPeer = createSocketPeer({
  host: 'localhost',
  port: 63636
})

// Access wrapped net.Socket instance
nlonPeer.socket
```

## Documentation

- [API docs](https://elementbound.github.io/nlon/nlon-socket/)
  - Or generate your own with `pnpm doc`

## License

This package is under the [MIT License](LICENSE).
