/** eslint-disable no-unused-vars */
import { ChatMessage } from '../protocol.mjs'
/** eslint-enable no-unused-vars */

function escape (text) {
  const node = document.createElement('p')
  node.innerText = text
  return node.innerHTML
}

/**
* Render message as HTML.
*
* @param {ChatMessage} message
* @returns {string}
*/
export function renderMessage (message) {
  // Hacky but simple
  return `
    <div class="message">
      <div class="message_timestamp">xx:yy</div>
      <div class="message_user">${escape(message.sender)}</div>
      <div class="message_content">${escape(message.content)}</div>
    </div>
`
}

export function appendMessage (message) {
  const contents = document.querySelector('.content')
  contents.innerHTML += renderMessage(message)
}
