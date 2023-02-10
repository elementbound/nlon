import net from 'node:net'
import * as nlon from '@elementbound/nlon'

/**
* Create an NLON server listening on socket.
*
* @param {object} options Options
* @returns {nlon.Server} Server
*/
export function createSocketServer (options) {
  const socketServer = options instanceof net.Server
    ? options
    : net.createServer(options)

  socketServer.listen(options)

  const nlonServer = new nlon.Server(options)
  socketServer.on('connection', connection => nlonServer.connect(connection))

  nlonServer.socket = socketServer
  return nlonServer
}
