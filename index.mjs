import { Duplex, PassThrough, Transform } from 'node:stream'
import { Header, Message } from './lib/protocol.mjs'
import { Server } from './lib/server/server.mjs'

function main() {
  const stream = new PassThrough()
  const server = new Server()

  server.connect(stream)

  const message = JSON.stringify(new Message({
    header: new Header({
      subject: 'echo'
    }),

    body: 'Hello world!'
  }))

  stream.write(message + '\n')
}

main()
