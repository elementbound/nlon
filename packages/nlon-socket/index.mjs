import pino from 'pino'
import { Message, MessageHeader, MessageTypes } from '@elementbound/nlon'
import { createSocketClient } from './lib/client.mjs'
import { createSocketServer } from './lib/server.mjs'

const level = 'info'

async function sleep (t) {
  return new Promise(resolve =>
    setTimeout(resolve, t)
  )
}

async function server () {
  const logger = pino({ name: 'server', level })
  logger.info('Creating server')

  const server = createSocketServer({
    host: 'localhost',
    port: 63636,
    logger
  })

  server.handle('echo', async correspondence => {
    const chunk = await correspondence.next()
    correspondence.write(chunk)
    correspondence.finish('OK')
  })

  logger.info('Waiting for some messages...')
  await sleep(5000)

  logger.info('Shutting down')
  server.socket.close()
}

async function client () {
  const logger = pino({ name: 'client', level })
  logger.info('Creating client')

  const client = createSocketClient({
    host: 'localhost',
    port: 63636,
    logger
  })

  logger.info('Waiting a bit')
  await sleep(200)

  logger.info('Sending message')
  const correspondence = client.send(new Message({
    header: new MessageHeader({ subject: 'echo' }),
    body: 'Hello nlon!'
  }))

  const response = await correspondence.next()
  logger.info('Server response: ' + response)

  logger.info('Shutting down')
  client.socket.destroy()
}

server()
client()
