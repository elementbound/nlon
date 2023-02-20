import { ChatMessage } from '../protocol.mjs'
import { appendMessage } from './ui.mjs'

export function registerMessageHandlers (server) {
  server.handle('history', async (_peer, correspondence) => {
    for await (const message of correspondence.all()) {
      if (!message) {
        continue
      }

      console.log('Received history', message)
      appendMessage(message)
    }

    correspondence.finish()
  })

  server.handle('message', async (_peer, correspondence) => {
    for await (const message of correspondence.all()) {
      if (!message) {
        continue
      }

      console.log('Received message', message)
      appendMessage(message)
    }

    correspondence.finish()
  })

  server.handleException((_peer, _correspondence, err) => {
    appendMessage(new ChatMessage({
      sender: '@error',
      content: `${err.name}: ${err.message}`
    }))
  })
}
