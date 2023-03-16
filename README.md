# nlon

*Pronounced neigh-lon.*

A bidirectional communication protocol that can be used over raw sockets,
WebSockets or any other method of transmission.

Its main use case is situations where you have a transport layer without any
structure, e.g. TCP sockets where you stream arbitrary bytes. The role of nlon
here is to provide a convenient layer on top of the transport to give shape to
the data being transmitted.

This repository includes the protocol specification and a reference
implementation in JavaScript.

## Features

- 📦 Almost no dependencies
  - The core uses 3 dependencies: pino, nanoid, ndjson
- 🔩 Protocol-agnostic
  - Works the same over TCP as WebSockets by using Adapters
- ⚡ Simple specification
  - The whole spec is a ~5 min read
- 🎉 Express-inspired API for writing Servers
  - Register (route) handlers to respond to incoming messages
- 📨 Streaming supported by design
  - Protocol permits transmitting data in multiple chunks

### Adapters

- [nlon-socket](packages/nlon-socket) for TCP sockets
- [nlon-websocket](packages/nlon-websocket) for the browser

## Install

- pnpm: `pnpm add @elementbound/nlon`
- npm: `npm i @elementbound/nlon`
- yarn: `yarn add @elementbound/nlon`

## Usage

See the [reference implementation](packages/nlon).

## Documentation

- [Protocol specification](doc/spec/protocol.md)
- [Example flow](doc/spec/example-flow.md)
- [API docs](https://elementbound.github.io/nlon/)
  - Or generate your own with JSDoc: `pnpm -r doc`
- Tutorials
  - [Implementing a server](doc/tutorial/server.md)
  - [Implementing a peer](doc/tutorial/peer.md)
- Examples
  - [WebSocket example](examples/websocket-chat/)

## License

This package is under the [MIT License](LICENSE).
