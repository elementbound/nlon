/* eslint-disable no-unused-vars */
import { Message, MessageTypes } from '../protocol.mjs'
/* eslint-enable no-unused-vars */

import stream from 'stream'
import assert, { fail } from 'node:assert'

// TODO: Try and consolidate correspondence API between client and server
export class IncomingCorrespondence extends stream.EventEmitter {
  #stream
  #isFinished = false

  #chunks = undefined
  #isGathering = false

  constructor (stream) {
    super()
    this.#stream = stream ?? fail('Missing stream!')
  }

  /**
  * Handle message
  *
  * @param {Message} message
  */
  handle (message) {
    if (message.type === MessageTypes.Data) {
      this.emit('data', message.body, false)
      this.#chunks?.push(message.body)
    }

    if (message.type === MessageTypes.Finish) {
      this.#isFinished = true

      // Emit data event if there's a message body
      message.body !== undefined &&
        this.emit('data', message.body, true)

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

  get stream () {
    return this.#stream
  }

  get isFinished () {
    return this.#isFinished
  }

  get isGathering () {
    return this.#isGathering
  }

  get chunks () {
    assert(this.#isGathering, 'Can\'t get chunks if not gathering!')
    return this.#chunks
  }

  // event: data
  // event: finish
  // event: error
}
