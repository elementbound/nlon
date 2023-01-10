import { Header, Message, MessageTypes } from '../protocol.mjs'
import { fail } from 'node:assert'

/* eslint-disable no-unused-vars */
import stream from 'node:stream'
/* eslint-enable no-unused-vars */

export class Response {
  /** @type {stream.Duplex} */
  #stream

  #isFinished = false

  header = new Header()

  /**
  * Construct a response.
  *
  * @param {object} options Options
  * @param {Header} options.header Response header
  * @param {stream.Duplex} options.stream Stream
  */
  constructor (options) {
    this.#stream = options?.stream ?? fail('Stream must be specified for response!')
    options.header && (this.header = options.header)
  }

  get isFinished () {
    return this.#isFinished
  }

  write (data) {
    const message = new Message({
      type: MessageTypes.Data,
      header: this.header,
      body: data
    })

    this.#write(message)
  }

  finish (data) {
    const message = new Message({
      type: MessageTypes.Finish,
      header: this.header
    })

    if (data) {
      message.body = data
    }

    this.#write(message)
    this.#isFinished = true
  }

  error (err) {
    const message = new Message({
      type: MessageTypes.Data,
      header: this.header,
      error: err
    })

    this.#write(message)
    this.#isFinished = true
  }

  #write (message) {
    // TODO: Consider custom serializer, e.g. for ajv
    const serialized = JSON.stringify(message)

    this.#stream.write(serialized + '\n')
  }
}
