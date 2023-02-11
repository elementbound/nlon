import net from 'node:net'
import * as nlon from '@elementbound/nlon'

/**
* @summary A socket-specific extension of {@link nlon.Client}
*
* @description This class is an NLON Client that wraps and manages a
* {@link net.Socket} instance. All messages arriving on the socket will be
* processed and all outbound traffic will be sent on the socket.
*
* The underlying socket can also be accessed using `.socket`.
*
* > This class shouldn't be instantiated directly, instead use the factory
* > methods.
*
* @extends {nlon.Client}
* @see wrapSocketClient
* @see createSocketClient
*/
class SocketClient extends nlon.Client {
  /** @type {net.Socket} */
  #socket

  /**
  * Construct a client.
  *
  * @param {nlon.ClientOptions} options Options
  * @param {net.Socket} options.socket Socket to wrap
  */
  constructor (options) {
    super(options.socket, options)
    this.#socket = options.socket
  }

  /**
  * The underlying Socket.
  *
  * @type {net.Socket}
  */
  get socket () {
    return this.#socket
  }
}

/**
* Wrap an existing {@link net.Socket} with an NLON Client.
*
* @param {net.Socket} socket Socket
* @param {nlon.ClientOptions} options NLON client options
*/
export function wrapSocketClient (socket, options) {
  return new SocketClient({
    ...options,
    socket
  })
}

/**
* @summary Create NLON client managing a socket.
*
* @description This method will automatically create a socket based on the input
* options using {@link net.createConnection}.
*
* > The options method will be passed to both `net.createConnection` ( and by
* > extension to net.Socket constructor and its `.connect()`) and to
* > SocketClient's constructor.
*
* @param {net.SocketConstructorOpts | net.SocketConnectOpts | net.ConnectOpts |
*   nlon.ClientOptions} options Options
* @returns {nlon.Client} Client
*/
export function createSocketClient (options) {
  const socket = net.createConnection(options)
  return wrapSocketClient(socket, options)
}
