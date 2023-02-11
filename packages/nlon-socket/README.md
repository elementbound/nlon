# nlon-socket

Socket adapter for [NLON](https://github.com/elementbound/nlon).

Since NLON by itself is not concerned by the actual method of data transfer,
adapters can be used to apply the protocol over various media.

This package provides such an adapter for use with Node's
[sockets](https://nodejs.org/api/net.html).

## Install

Install with npm:

```bash
npm i @elementbound/nlon-socket
```

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

To generate the reference documentation, run the following:

```js
npm run doc
```

The resulting docs will be under the `jsdoc` directory.

## License

This package is under the [MIT License](LICENSE).

