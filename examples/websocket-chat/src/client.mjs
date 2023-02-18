import * as nlon from '@elementbound/nlon'
import * as nlonws from '@elementbound/nlon-websocket'
import { ChatMessage } from './protocol.mjs'

function renderMessage (message) {
  const chatMessage = new ChatMessage(message)

  // Hacky but simple
  return `
    <div class="message">
      <div class="message_timestamp">xx:yy</div>
      <div class="message_user">${chatMessage.sender}</div>
      <div class="message_content">${chatMessage.content}</div>
    </div>
`
}

function appendMessage (message) {
  const contents = document.querySelector('.content')
  contents.innerHTML += renderMessage(message)
}

const wsTarget = `ws://${window.location.host}/`

console.log('Connecting to', wsTarget)
const ws = new WebSocket(wsTarget)
ws.onopen = () => console.log('WS connection successful!')

const nlonp = nlonws.wrapWebSocketPeer(ws)
const nlons = new nlon.Server()
nlons.connect(new nlonws.WebSocketStream(ws))

nlons.handle('history', async (peer, correspondence) => {
  for await (const message of correspondence.all()) {
    if (!message) {
      continue
    }

    console.log('Received history', message)
    appendMessage(message)
  }

  correspondence.finish()
})

nlons.handle('message', async (peer, correspondence) => {
  for await (const message of correspondence.all()) {
    if (!message) {
      continue
    }

    console.log('Received message', message)
    appendMessage(message)
  }

  correspondence.finish()
})

window.addEventListener('load', () => {
  console.log('Hi!')
  const inputs = {
    name: document.querySelector('.chatbox_name'),
    content: document.querySelector('.chatbox_message'),
    send: document.querySelector('.chatbox_send')
  }

  console.log('inputs', inputs)

  inputs.content.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'Enter') {
      inputs.content.value += '\n'
      e.stopImmediatePropagation()
    }
  })

  inputs.send.addEventListener('click', e => {
    const name = inputs.name.value
    const content = inputs.content.value
    const chatMessage = new ChatMessage({
      sender: name,
      content
    })

    nlonp.send(new nlon.Message({
      header: new nlon.MessageHeader({
        subject: 'message'
      }),

      body: chatMessage
    }))
      .finish()

    inputs.content.value = ''
  })

  Object.values(inputs).forEach(e => {
    e.addEventListener('keydown', e => {
      if (e.key !== 'Enter') {
        return
      }

      inputs.send.click()
    })
  })
})
