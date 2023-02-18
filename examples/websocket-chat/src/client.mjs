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

nlons.handle('history', async correspondence => {
  for await (const message of correspondence.all()) {
    console.log('Received history', message)
    appendMessage(message)
  }
})
