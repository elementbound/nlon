import stream from 'node:stream'
import assert from 'node:assert'
import { Message, MessageError, MessageHeader, MessageTypes } from '../protocol.mjs'

/**
* Bidirectional correspondence
*
* @extends Correspondence
*/
export class Correspondence extends stream.EventEmitter {
  /** @type {stream.Duplex} */
  #stream
  /** @type {MessageHeader} */
  #header

  #readable
  #writable

  /**
  * @param {object} options
  * @param {stream.Duplex} options.stream
  * @param {MessageHeader} options.header
  */
  constructor (options) {
    super()

    assert(options.stream, 'Missing stream!')

    this.#stream = options?.stream
    this.#header = options?.header

    this.#readable = true
    this.#writable = this.#header.correspondenceId && this.#header.subject
  }

  /** Use callback */
  with (cb) {}
  /** Get next data */
  async next () {}
  /** Async generator with all data */
  async all () {}

  /** Send data */
  write (data) {
    this.#write(
      this.#makeMessage({ data, type: MessageTypes.Data })
    )
  }

  /** Send finish */
  finish (data) {
    this.#write(
      this.#makeMessage({ data, type: MessageTypes.Finish })
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
  get readable () { return this.#readable }
  /** Check if writable */
  get writable () { return this.#writable }

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
}
