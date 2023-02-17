import ws from 'isomorphic-ws'
import * as nlon from '@elementbound/nlon'
import { WebSocketStream } from './websocket.wrapper.mjs'

class WebSocketWrapperPeer extends nlon.Peer {
  /** @type {ws.WebSocket} */
  #socket

  /**
  * @param {ws.WebSocket} socket
  * @param {nlon.PeerOptions} options
  */
  constructor (socket, options) {
    super(new WebSocketStream(socket), options)

    this.#socket = socket
  }

  /**
  * @type {ws.WebSocket} socket
  */
  get socket () {
    return this.#socket
  }
}

/**
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
* @param {nlon.PeerOptions | WebSocketOptions} options
*/
export function createWebSocketPeer (options) {
  const socket = new ws.WebSocket(options.address, options.protocols)

  return wrapWebSocketPeer(socket, options)
}
