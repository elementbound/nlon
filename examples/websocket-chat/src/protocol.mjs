import assert from 'node:assert'

export class ChatMessage {
  /** @type {string} */
  sender

  /** @type {string} */
  content

  // TODO: Timestamps

  /**
  * @param {ChatMessage} data
  */
  constructor (data) {
    data && Object.assign(this, data)

    assert(this.sender, 'Message must have a sender!')
    assert(this.content, 'Message must have content!')

    assert(this.sender.length < 128, 'Sender name too long!')
    assert(this.content.length < 1024, 'Message too large!')
  }
}
