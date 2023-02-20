import { Message, MessageHeader } from '@elementbound/nlon'
import { ChatMessage } from '../protocol.mjs'

function sendMessage (peer, sender, content) {
  const message = new Message({
    header: new MessageHeader({
      subject: 'message'
    }),

    body: new ChatMessage({
      sender,
      content
    })
  })

  console.log('Sending message', message)
  peer.send(message).finish()
}

export function newlineListener () {
  return e => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.targer.value += '\n'
      e.stopImmediatePropagation()
    }
  }
}

export function sendListener (peer, sender, content) {
  return e => {
    if (e.key && e.key !== 'Enter') {
      // If it's a key press event and not Enter, don't send
      return
    }

    sendMessage(peer, sender.value, content.value)

    setTimeout(() => content.value = '', 0)
  }
}
