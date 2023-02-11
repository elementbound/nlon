import { describe, it } from 'node:test'
import assert from 'node:assert'
import getPort from 'get-port'
import pino from 'pino'
import { createSocketServer } from '../lib/server.mjs'
import { createSocketClient } from '../lib/client.mjs'
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

    nlonServer.handle('test', async correspondence => {
      const data = await correspondence.next()
      correspondence.finish(response)

      nlonServer.socket.close()
      resolve(data)
    })
  })
}

async function runClient (port, message) {
  const nlonClient = createSocketClient({
    host: 'localhost',
    port,
    logger: pino({ level: 'debug', name: 'client' })
  })

  const correspondence = nlonClient.send(new Message({
    header: new MessageHeader({ subject: 'test' }),
    body: message
  }))

  const response = await correspondence.next()
  correspondence.finish()

  nlonClient.socket.destroy()
  return response
}

describe('nlon-socket', () => {
  it('should exchange', async () => {
    // Given
    logger.info('Looking for a free port...')
    const port = await getPort()
    logger.info('Found free port: %d', port)

    // When
    logger.info('Running server and client')
    const serverPromise = runServer(port, 'OK')
    const clientPromise = runClient(port, 'O?')

    // Then
    logger.info('Awaiting on results...')
    assert.equal(await serverPromise, 'O?')
    assert.equal(await clientPromise, 'OK')
  })
})
