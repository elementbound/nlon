import ws from 'isomorphic-ws'
import * as nlon from '@elementbound/nlon'
import { WebSocketStream } from './websocket.wrapper.mjs'

/**
* An nlon Peer.
* @external "nlon.Peer"
* @see {@link http://elementbound.github.io/nlon/reference/nlon/#class-Peer}
*/

/**
* Options for an nlon Peer.
* @external "nlon.PeerOptions"
* @see {@link
* http://elementbound.github.io/nlon/reference/nlon/#typedef-PeerOptions}
*/

/**
* @external "ws.WebSocket"
* @see {@link https://github.com/websockets/ws/blob/master/doc/ws.md#class-websocket}
*/

/**
* @summary A WebSocket-specific extension of {@link nlon.Peer}
*
* @description This class is an nlon Peer that wraps and manages a
* {@link WebSocket} instance. All messages arriving on the socket will be
* processed and all outbound traffic will be sent on it.
*
* The underlying WebSocket can also be accessed using `.stream`.
*
* > This class shouldn't be instantiated directly, instead use the factory
* > methods.
*
* @extends {nlon.Peer}
* @see wrapWebSocketPeer
* @see createWebSocketPeer
*/
class WebSocketWrapperPeer extends nlon.Peer {
  /** @type {ws.WebSocket} */
  #socket

  /**
  * Construct a peer.
  *
  * @param {ws.WebSocket} socket WebSocket to wrap
  * @param {nlon.PeerOptions} options Peer options
  */
  constructor (socket, options) {
    super(new WebSocketStream(socket), options)

    this.#socket = socket
  }

  /**
  * The underlying WebSocket.
  *
  * @type {ws.WebSocket}
  */
  get stream () {
    return this.isConnected
      ? this.#socket
      : undefined
  }
}

/**
* Wrap an existing WebSocket with an nlon Peer.
*
* @param {ws.WebSocket} socket
* @param {nlon.PeerOptions} options
* @returns {WebSocketWrapperPeer} Peer
*/
export function wrapWebSocketPeer (socket, options) {
  return new WebSocketWrapperPeer(socket, options)
}

/**
* @typedef {object} WebSocketOptions
* @property {string} address
* @property {string|string[]} [protocols]
*/

/**
* @summary Create nlon peer managing a WebSocket.
*
* @description This method will create a new WebSocket and wrap it in an nlon
* Peer. The created socket will automatically connect to the address specified.
*
* > The options parameter will be used to create the WebSocket and will be
* > passed to the nlon Peer as settings.
*
* @param {nlon.PeerOptions | WebSocketOptions} options Options
* @returns {WebSocketWrapperPeer} Peer
*/
export function createWebSocketPeer (options) {
  const socket = new ws.WebSocket(options.address, options.protocols)

  return wrapWebSocketPeer(socket, options)
}
