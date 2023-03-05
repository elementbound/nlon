# NLON

A bidirectional communication protocol that can be used over raw sockets,
WebSockets or any other method of transmission.

This repository includes the protocol specification and a reference
implementation in JavaScript.

## Features

- Almost no dependencies
  - The core uses pino for logging and ndjson for message parsing
- Protocol-agnostic
  - Works the same over TCP as WebSockets by using Adapters
- Simple specification
  - The whole thing is a ~5 min read
- Express-inspired API for writing Servers
  - Register (route) handlers to respond to incoming messages
- Streaming supported by design
  - Protocol permits transmitting data in multiple chunks

## Install

- pnpm: `pnpm add @elementbound/nlon`
- npm: `npm i @elementbound/nlon`

## Usage

See the [reference implementation](packages/nlon).

## Documentation

- [Protocol specification](doc/protocol.md)
- [Example flow](doc/example-flow.md)
- API docs: TODO
  - Or generate your own by running `pnpm -r doc`

## License

This package is under the [MIT License](LICENSE).
