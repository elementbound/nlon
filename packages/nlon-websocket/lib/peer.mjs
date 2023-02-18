import ws from 'isomorphic-ws'
import * as nlon from '@elementbound/nlon'
import { WebSocketStream } from './websocket.wrapper.mjs'

/**
* @summary A WebSocket-specific extension of {@link nlon.Peer}
*
* @description This class is an NLON Peer that wraps and manages a
* {@link WebSocket} instance. All messages arriving on the socket will be
* processed and all outbound traffic will be sent on it.
*
* The underlying WebSocket can also be accessed using `.socket`.
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
  get socket () {
    return this.#socket
  }
}

/**
* Wrap an existing WebSocket with an NLON Peer.
*
* @param {ws.WebSocket} socket
* @param {nlon.PeerOptions} options
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
* @summary Create NLON peer managing a WebSocket.
*
* @description This method will create a new WebSocket and wrap it in an NLON
* Peer. The created socket will automatically connect to the address specified.
*
* > The options parameter will be used to create the WebSocket and will be
* > passed to the NLON Peer as settings.
*
* @param {nlon.PeerOptions | WebSocketOptions} options Options
* @returns {nlon.Peer} Peer
*/
export function createWebSocketPeer (options) {
  const socket = new ws.WebSocket(options.address, options.protocols)

  return wrapWebSocketPeer(socket, options)
}
