/* eslint-disable no-unused-vars */
import stream from 'node:stream'
import { Message, MessageError, MessageHeader, MessageTypes } from '../protocol.mjs'
/* eslint-enable no-unused-vars */

import assert from 'node:assert'
import events from 'node:events'
import { CorrespondenceError } from '../error.mjs'

const _CorrespondenceEnd = Symbol('Correspondence.End')

/**
* Read handler callback
*
* @callback ReadHandler
* @param {any} body Message body
* @param {MessageHeader} header Message header
* @param {object} context Message context
*/

/**
* Bidirectional correspondence
*/
export class Correspondence extends events.EventEmitter {
  /** @type {stream.Duplex} */
  #stream
  /** @type {MessageHeader} */
  #header

  /** @type {boolean} */
  #readable
  /** @type {boolean} */
  #writable

  #internal = new events.EventEmitter()
  #context = {}

  static get End () {
    return _CorrespondenceEnd
  }

  /**
  * @param {object} options
  * @param {stream.Duplex} options.stream
  * @param {MessageHeader} options.header
  */
  constructor (options) {
    super()

    this.#stream = options?.stream
    this.#header = options?.header

    this.#readable = true
    this.#writable =
      this.#stream &&
      this.#header.correspondenceId && this.#header.subject
  }

  /** Handle message */
  handle (message) {
    if (message.type === MessageTypes.Data) {
      this.#header = message.header
      this.emit('data', message.body, false)
    }

    if (message.type === MessageTypes.Finish) {
      this.#readable = false
      this.#header = message.header

      message.body !== undefined &&
        this.emit('data', message.body, true)

      this.emit('finish')
    }

    if (message.type === MessageTypes.Error) {
      this.#readable = false
      this.#header = message.header

      this.emit('error', new CorrespondenceError(message.error))
    }
  }

  /**
  * Get next data
  * @param {...ReadHandler} handlers Read handlers
  * @returns {any} Resulting data or Correspondence.End
  */
  async next (...handlers) {
    this.#ensureReadable()
    const data = await this.#nextChunk()

    if (data === _CorrespondenceEnd) {
      return data
    } else {
      this.#context = {}
      for (const handler of handlers) {
        await handler(data, this.#header, this.#context)
      }

      return data
    }
  }

  /**
  * Async generator with all data
  * @param {...ReadHandler} handlers Read handlers
  * @returns {AsyncGenerator} Incoming data
  */
  async * all (...handlers) {
    while (this.readable) {
      const data = await this.next(...handlers)
      if (data !== _CorrespondenceEnd) {
        yield Promise.resolve(data)
        continue
      }

      break
    }
  }

  /** Send data */
  write (data) {
    this.#write(
      this.#makeMessage({ body: data, type: MessageTypes.Data })
    )
  }

  /** Send finish */
  finish (data) {
    this.#write(
      this.#makeMessage({ body: data, type: MessageTypes.Finish })
    )

    this.#writable = false
  }

  /** Send error */
  error (e) {
    this.#write(
      this.#makeMessage({ error: e, type: MessageTypes.Error })
    )

    this.#writable = false
  }

  /** Check if readable */
  get readable () {
    return this.#readable
  }

  /** Get context */
  get context () {
    return this.#context
  }

  /** Check if writable */
  get writable () {
    return this.#writable
  }

  emit (name, ...args) {
    const isInternal = this.#internal.eventNames()
      .some(name => this.#internal.listenerCount(name) > 0)

    if (isInternal) {
      // If there's internal listeners, only emit there
      this.#internal.emit(name, ...args)
    } else {
      super.emit(name, ...args)
    }
  }

  #nextChunk () {
    let handlers = {}

    return new Promise((resolve, reject) => {
      // Save handlers so we can clean up afterwards
      handlers = {
        data: resolve,
        finish: () => resolve(_CorrespondenceEnd),
        error: reject
      }

      Object.entries(handlers).forEach(([name, handler]) =>
        this.#internal.once(name, handler))
    }).finally(() => {
      // Clean up once event was handled
      Object.entries(handlers).forEach(([name, handler]) =>
        this.#internal.off(name, handler))
    })
  }

  #write (message) {
    this.#ensureWritable()

    // TODO: Consider custom serializer, e.g. for ajv
    const serialized = JSON.stringify(message)

    this.#stream.write(serialized + '\n')
  }

  /**
  * @param {object} options
  * @param {MessageType} [options.type]
  * @param {any} [options.body]
  * @param {MessageError} [options.error]
  */
  #makeMessage (options) {
    return new Message(
      Object.assign(
        { header: this.#header },
        options ?? {}))
  }

  #ensureWritable () {
    // TODO: Custom exception
    assert(this.#writable, 'Correspondence not writable!')
  }

  #ensureReadable () {
    // TODO: Custom exception
    assert(this.#readable, 'Correspondence not readable!')
  }
}
