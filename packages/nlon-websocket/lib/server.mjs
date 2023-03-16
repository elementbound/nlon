import ws from 'isomorphic-ws'
import * as nlon from '@elementbound/nlon'
import { WebSocketStream } from './websocket.wrapper.mjs'

/**
* @summary A WebSocket-specific extension of {@link nlon.Server}.
*
* @description This class functions exactly the same as {@link nlon.Server},
* with the addition that it keeps a reference to a {@link WebSocketStream} which
* can be accessed through the `server` field.
*
* Any incoming WebSocket connection will be wrapped in {@link WebSocketStream}
* and connected to the nlon server.
*
* > This class shouldn't be instantiated directly, instead use the factory
* > methods.
*
* @extends {nlon.Server}
* @see wrapWebSocketServer
* @see createWebSocketServer
*/
class WebSocketWrapperServer extends nlon.Server {
  /**
  * Construct server.
  *
  * @param {ws.WebSocketServer} server WebSocketServer
  * @param {nlon.ServerOptions} options nlon server options
  */
  constructor (server, options) {
    super({
      ...options,
      stream: server
    })

    server.on('error', err => this.emit('error', err))
    server.on('wsClientError', err => this.emit('error', err))
    server.on('connection', (ws, _req) =>
      this.connect(new WebSocketStream(ws))
    )
  }

  /**
  * The underlying server.
  *
  * @type {ws.WebSocketServer}
  */
  get stream () {
    return super.stream
  }
}

/**
* Wrap an existing WebSocketServer as an nlon Server.
*
* @param {ws.WebSocketServer} server WebSocket server
* @param {nlon.ServerOptions} options nlon server options
* @returns {WebSocketWrapperServer}
*/
export function wrapWebSocketServer (server, options) {
  return new WebSocketWrapperServer(server, options)
}

/**
* @summary Create an nlon server listening on WebSocket.
*
* @description The WebSocket server will be automatically created based on the
* input options. Under the hood, the `ws` package is used, which also means that
* depending on the options, an HTTP server will be launched.
*
* > The options parameter will be used to both create the WebSocket server and
* > the nlon server.
*
* @param {nlon.ServerOptions | ws.ServerOptions} options Options
* @returns {WebSocketWrapperServer}
*/
export function createWebSocketServer (options) {
  const server = new ws.WebSocketServer(options)

  return wrapWebSocketServer(server, options)
}
