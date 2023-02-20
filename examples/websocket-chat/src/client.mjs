import * as nlon from '@elementbound/nlon'
import * as nlonws from '@elementbound/nlon-websocket'
import { registerMessageHandlers } from './client/handlers.mjs'
import { newlineListener, sendListener } from './client/listeners.mjs'

window.addEventListener('load', () => {
  const wsTarget = `ws://${window.location.host}/`

  console.log('Connecting to', wsTarget)
  const ws = new WebSocket(wsTarget)
  ws.onopen = () => console.log('WS connection successful!')

  const nlonp = nlonws.wrapWebSocketPeer(ws)
  const nlons = new nlon.Server()
  nlons.connect(new nlonws.WebSocketStream(ws))
  nlons.configure(registerMessageHandlers)

  const inputs = {
    name: document.querySelector('.chatbox_name'),
    content: document.querySelector('.chatbox_message'),
    send: document.querySelector('.chatbox_send')
  }

  inputs.content.addEventListener('keydown', newlineListener())
  inputs.send.addEventListener('click',
    sendListener(nlonp, inputs.name, inputs.content))

  Object.values(inputs).forEach(e => {
    e.addEventListener('keydown',
      sendListener(nlonp, inputs.name, inputs.content))
  })
})
