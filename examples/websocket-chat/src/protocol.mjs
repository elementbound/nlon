import assert from 'node:assert'

export class ChatMessage {
  /** @type {string} */
  sender

  /** @type {string} */
  content

  /** @type {number} */
  timestamp

  /**
  * @param {ChatMessage} data
  */
  constructor (data) {
    data && Object.assign(this, data)

    assert(this.sender, 'Message must have a sender! ' + JSON.stringify(data))
    assert(this.content, 'Message must have content! ' + JSON.stringify(data))

    assert(this.sender.length < 128, 'Sender name too long!')
    assert(this.content.length < 1024, 'Message too large!')
  }
}
