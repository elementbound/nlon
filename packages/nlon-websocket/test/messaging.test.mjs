import { describe, it } from 'node:test'
import assert from 'node:assert'
import getPort from 'get-port'
import pino from 'pino'
import { createWebSocketServer } from '../lib/server.mjs'
import { createWebSocketPeer } from '../lib/peer.mjs'
import { Message, MessageHeader } from '@elementbound/nlon'

const logger = pino({ name: 'test' })

function promiseEvent (emitter, event) {
  return new Promise(resolve => emitter.on(event, resolve))
}

function runServer (port, response) {
  return new Promise(resolve => {
    logger.info('Starting server...')
    const nlonServer = createWebSocketServer({
      host: 'localhost',
      port,
      logger: pino({ level: 'debug', name: 'server' })
    })

    nlonServer.handle('test', async (_peer, correspondence) => {
      const data = await correspondence.next()
      correspondence.finish(response)

      nlonServer.stream.close()
      resolve(data)
    })
  })
}

async function runPeer (port, message) {
  const nlonPeer = createWebSocketPeer({
    address: `ws://localhost:${port}/`,
    logger: pino({ level: 'debug', name: 'peer' })
  })

  await promiseEvent(nlonPeer.stream, 'open')

  const correspondence = nlonPeer.send(new Message({
    header: new MessageHeader({ subject: 'test' }),
    body: message
  }))

  const response = await correspondence.next()
  correspondence.finish()

  nlonPeer.stream.close()
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
