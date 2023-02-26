/* eslint-disable no-unused-vars */
import { ChatMessage } from '../protocol.mjs'
/* eslint-enable no-unused-vars */

function escape (text) {
  const node = document.createElement('p')
  node.innerText = text
  return node.innerHTML
}

/**
* @param {Date} date
*/
function formatDate (date) {
  if (date === undefined) {
    return '??:??'
  }

  date = new Date(date)
  const hours = date.getHours().toString()
  const minutes = date.getMinutes().toString()

  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
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
      <div class="message_timestamp">${formatDate(message.timestamp)}</div>
      <div class="message_user">${escape(message.sender)}</div>
      <div class="message_content">${escape(message.content)}</div>
    </div>
`
}

export function appendMessage (message) {
  const contents = document.querySelector('.content')
  contents.innerHTML += renderMessage(message)
}
