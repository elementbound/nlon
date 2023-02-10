import net from 'node:net'
import * as nlon from '@elementbound/nlon'

/**
* Create NLON client managing a socket.
*
* @param {object} options Options
* @returns {nlon.Client} Client
*/
export function createSocketClient (options) {
  const socket = options instanceof net.Socket
    ? options
    : net.createConnection(options)

  const nlonClient = new nlon.Client(socket, options)
  nlonClient.socket = socket

  return nlonClient
}
