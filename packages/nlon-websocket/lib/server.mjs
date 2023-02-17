/* eslint-disable no-unused-vars */
import * as ws from 'isomorphic-ws'
/* eslint-enable no-unused-vars */

import * as nlon from '@elementbound/nlon'
import { WebSocketStream } from './websocket.wrapper.mjs'

class WebSocketWrapperServer extends nlon.Server {
  /** @type {ws.WebSocketServer} */
  #server

  /**
  * @param {ws.WebSocketServer} server WebSocketServer
  * @param {nlon.ServerOptions} options NLON server options
  */
  constructor (server, options) {
    super(options)

    this.#server = server
    this.#server.on('error', err => this.emit('error', err))
    this.#server.on('wsClientError', err => this.emit('error', err))
    this.#server.on('connection', (ws, _req) =>
      this.connect(new WebSocketStream(ws))
    )
  }

  /**
  * @type {ws.WebSocketServer}
  */
  get server () {
    return this.#server
  }
}

/**
* @param {ws.WebSocketServer} server
* @param {nlon.ServerOptions} options
*/
export function wrapWebSocketServer (server, options) {
  return new WebSocketWrapperServer(server, options)
}

/**
 * @param {nlon.ServerOptions | ws.ServerOptions}
 */
export function createWebSocketServer (options) {
  const server = new ws.WebSocketServer(options)

  return wrapWebSocketServer(server, options)
}
