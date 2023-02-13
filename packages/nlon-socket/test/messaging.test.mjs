import { describe, it } from 'node:test'
import assert from 'node:assert'
import getPort from 'get-port'
import pino from 'pino'
import { createSocketServer } from '../lib/server.mjs'
import { createSocketPeer } from '../lib/peer.mjs'
import { Message, MessageHeader } from '@elementbound/nlon'

const logger = pino({ name: 'test' })

function runServer (port, response) {
  return new Promise(resolve => {
    logger.info('Starting server...')
    const nlonServer = createSocketServer({
      host: 'localhost',
      port,
      logger: pino({ level: 'debug', name: 'server' })
    })

    nlonServer.handle('test', async (peer, correspondence) => {
      const data = await correspondence.next()
      correspondence.finish(response)

      nlonServer.server.close()
      resolve(data)
    })
  })
}

async function runPeer (port, message) {
  const nlonPeer = createSocketPeer({
    host: 'localhost',
    port,
    logger: pino({ level: 'debug', name: 'peer' })
  })

  const correspondence = nlonPeer.send(new Message({
    header: new MessageHeader({ subject: 'test' }),
    body: message
  }))

  const response = await correspondence.next()
  correspondence.finish()

  nlonPeer.socket.destroy()
  return response
}

describe('nlon-socket', { timeout: 10000 }, () => {
  it('should exchange', async () => {
    // Given
    logger.info('Looking for a free port...')
    const port = await getPort()
    logger.info('Found free port: %d', port)

    // When
    logger.info('Running server and peer')
    const serverPromise = runServer(port, 'OK')
    const peerPromise = runPeer(port, 'O?')

    // Then
    logger.info('Awaiting on results...')
    assert.equal(await serverPromise, 'O?')
    assert.equal(await peerPromise, 'OK')
  })
})
