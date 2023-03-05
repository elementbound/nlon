import * as http from 'node:http'
import express from 'express'
import pino from 'pino'
import * as nlon from '@elementbound/nlon'
import * as nlonws from '@elementbound/nlon-websocket'
import { ChatMessage } from './protocol.mjs'

const port = process.env.PORT ?? 3000
const logLevel = process.env.LOGLEVEL ?? 'info'

const app = express()
const httpServer = http.createServer(app)
const nlons = nlonws.createWebSocketServer({ server: httpServer })
const logger = pino({ level: logLevel })

const messages = [
  new ChatMessage({
    sender: '@server',
    content: 'Greetings!',
    timestamp: +(new Date())
  })
]

app.use((req, _res, next) => {
  logger.info({
    path: req.path,
    params: req.params,
    headers: req.headers,
    method: req.method,
    ip: req.ip
  }, 'Incoming request')

  next()
})

app.use(express.static('dist'))

nlons.on('connect', (stream, peer) => {
  // Send all messages to new peer
  /** @type {nlon.Correspondence} */
  const correspondence = peer.send(new nlon.Message({
    header: new nlon.MessageHeader({ subject: 'history' })
  }))

  messages.forEach(message => correspondence.write(message))
  correspondence.finish()
})

nlons.handle('message', async (peer, correspondence) => {
  for await (const message of correspondence.all()) {
    logger.info({ message }, 'Received message to parse')
    const chatMessage = new ChatMessage(message)
    chatMessage.timestamp = +(new Date())
    logger.info({ chatMessage }, 'Received message')

    // Store message
    messages.push(chatMessage)

    // Broadcast message
    nlons.peers.forEach(peer =>
      peer.send(new nlon.Message({
        header: new nlon.MessageHeader({ subject: 'message' }),
        body: chatMessage
      }))
        .finish()
    )
  }

  // Finish correspondence
  correspondence.finish()
})

httpServer.listen(port, () => {
  logger.info(`Listening on port ${port}`)
})
