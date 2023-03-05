import net from 'node:net'
import * as nlon from '@elementbound/nlon'

/**
* @summary A socket-specific extension of {@link nlon.Peer}
*
* @description This class is an NLON Peer that wraps and manages a
* {@link net.Socket} instance. All messages arriving on the socket will be
* processed and all outbound traffic will be sent on the socket.
*
* The underlying socket can also be accessed using `.stream`.
*
* > This class shouldn't be instantiated directly, instead use the factory
* > methods.
*
* @extends {nlon.Peer}
* @see wrapSocketPeer
* @see createSocketPeer
*/
class SocketPeer extends nlon.Peer {
  /**
  * Construct a peer.
  *
  * @param {nlon.PeerOptions} options Options
  * @param {net.Socket} options.socket Socket to wrap
  */
  constructor (options) {
    super(options.socket, options)
  }

  /**
  * Get the underlying {@link net.Socket|Socket}.
  *
  * @type {net.Socket}
  */
  get stream () {
    return super.stream
  }
}

/**
* Wrap an existing {@link net.Socket} with an NLON Peer.
*
* @param {net.Socket} socket Socket
* @param {nlon.PeerOptions} [options] NLON peer options
* @returns {SocketPeer} Peer
*/
export function wrapSocketPeer (socket, options) {
  return new SocketPeer({
    ...options,
    socket
  })
}

/**
* @summary Create NLON peer managing a socket.
*
* @description This method will automatically create a socket based on the input
* options using {@link net.createConnection}.
*
* > The options parameter will be passed to both `net.createConnection` ( and by
* > extension to net.Socket constructor and its `.connect()`) and to
* > SocketPeer's constructor.
*
* @param {net.SocketConstructorOpts | net.SocketConnectOpts | net.ConnectOpts |
*   nlon.PeerOptions} options Options
* @returns {SocketPeer} Peer
*/
export function createSocketPeer (options) {
  const socket = net.createConnection(options)
  return wrapSocketPeer(socket, options)
}
