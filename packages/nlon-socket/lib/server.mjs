import net from 'node:net'
import * as nlon from '@elementbound/nlon'

/**
* @summary A socket-specific extension of {@link nlon.Server}.
*
* @description This class functions exactly the same as {@link nlon.Server},
* with the addition that it keeps a reference to a {@link net.Server} which can
* be accessed through the `server` field.
*
* Any incoming connection over this server will be automatically connected to
* and managed by the NLON server.
*
* > This class shouldn't be instantiated directly, instead use the factory
* > methods.
*
* @extends {nlon.Server}
* @see wrapSocketServer
* @see createSocketServer
*/
class SocketServer extends nlon.Server {
  /** @type {net.Server} */
  #server

  /**
  * Construct server.
  *
  * @param {nlon.ServerOptions} options Options
  * @param {net.Server} options.server Server instance to wrap
  */
  constructor (options) {
    super(options)
    this.#server = options?.server

    this.#server.on('connection', connection => this.connect(connection))
  }

  /**
  * The underlying net.Server instance.
  *
  * @type {net.Server}
  */
  get server () {
    return this.#server
  }
}

/**
* @summary Wrap an existing {@link net.Server} instance with an NLON Server.
*
* @description > You will have to manually call `.listen()`!
*
* @param {net.Server} server Existing server
* @param {nlon.ServerOptions} [options] NLON Server options
* @returns {SocketServer} NLON Server
*/
export function wrapSocketServer (server, options) {
  return new SocketServer({
    ...options,
    server
  })
}

/**
* @summary Create an NLON server listening on socket.
*
* @description A {@link net.Server} instance will be created based on the
* incoming options. This will also automatically call `.listen()` on the socket
* server before wrapping it in an NLON server.
*
* > The same options object will be passed to `net.createServer`, `.listen()`
* > and the new NLON Server instance.
*
* @param {net.ServerOpts | net.ListenOptions | nlon.ServerOptions} options Options
* @returns {SocketServer} Server
*
* @see wrapSocketServer
*/
export function createSocketServer (options) {
  const socketServer = net.createServer(options)
  socketServer.listen(options)

  return wrapSocketServer(socketServer, options)
}
