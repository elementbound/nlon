import stream from 'stream'
import assert, { fail } from 'node:assert'
import { Message, MessageTypes } from '../protocol.mjs'

export class IncomingCorrespondence extends stream.EventEmitter {
  #stream
  #header
  #isFinished = false

  #chunks = undefined
  #isGathering = false

  constructor (stream, header) {
    super()

    this.#stream = stream ?? fail('Missing stream!')
    this.#header = header ?? fail('Missing header!')
  }

  /**
  * Handle message
  *
  * @param {Message} message
  */
  handle (message) {
    if (message.type === MessageTypes.Data) {
      this.emit('data', message.body, false)
    }

    if (message.type === MessageTypes.Finish) {
      // Emit data event if there's a message body
      message.body !== undefined &&
        this.emit('data', message.body, true)

      this.#isFinished = true
      this.emit('finish')
    }

    if (message.type === MessageTypes.Error) {
      this.#isFinished = true
      // TODO: Wrap in some Error type
      this.emit('error', message.error)
    }
  }

  gather (enable) {
    this.#isGathering = enable ?? true

    if (this.#isGathering) {
      this.#chunks ??= []
    } else if (!this.#isGathering) {
      this.#chunks = undefined
    }
  }

  promise () {
    return new Promise((resolve, reject) => {
      this.once('finish', resolve)
      this.once('error', reject)
    })
  }

  promiseSingle () {
    return new Promise((resolve, reject) => {
      this.once('data', resolve)
      this.once('error', reject)
    })
  }

  promiseAll () {
    this.gather()
    return new Promise((resolve, reject) => {
      this.once('finish', () => resolve(this.#chunks))
      this.once('error', reject)
    })
  }

  get chunks () {
    assert(this.#isGathering, 'Can\'t get chunks if not gathering!')
    return this.#chunks
  }

  // event: data
  // event: finish
  // event: error
}
