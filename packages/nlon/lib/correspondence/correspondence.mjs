/* eslint-disable no-unused-vars */
import stream from 'node:stream'
import { Message, MessageError, MessageHeader, MessageTypes } from '../protocol.mjs'
/* eslint-enable no-unused-vars */

import events from 'node:events'
import { CorrespondenceError, UnreadableCorrespondenceError, UnwritableCorrespondenceError } from '../error.mjs'

const _CorrespondenceEnd = Symbol('Correspondence.End')

/**
* @summary Read handler callback.
*
* Read handlers can be used to specify operations to apply to incoming data. For
* example they can be used to validate incoming messages.
*
* They are also given access to a context object that is specific to that single
* message that the read handlers are called on. This can be used to extract
* useful data based on the message that can be accessed later down the line.
*
* @example
* const data = await correspondence.next(
*   // Make sure there's an auth string in the header, otherwise throw
*   requireAuth(),
*   // Extract user object and store in context
*   requireValidUser()
* )
*
* // We can grab the user from the correspondence context, where
* //`requireValidUser` saved it
* const { user } = correspondence.context
*
* // Then do whatever we need with the extracted data
* sessionManager.login(user)
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

  /**
  * @summary Correspondence end symbol.
  *
  * @description This symbol is returned during Correspondence reads. It is used
  * to signify that the correspondence has just become unreadable during read.
  *
  * > If the correspondence was already unreadable due to a previous finish or
  * > error message, reads throw instead of returning `End`.
  *
  * @type {Symbol}
  */
  static get End () {
    return _CorrespondenceEnd
  }

  /**
  * Construct a correspondence.
  *
  * @param {object} [options] Correspondence options
  * @param {stream.Duplex} [options.stream] Stream this correspondence belongs to
  * @param {MessageHeader} [options.header] Correspondence header
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

  /**
  * @summary Handle message.
  *
  * @description This method is called from the outside, typically by the {@link
  * Peer} or {@link Server}, when a message belonging to this instance's
  * correspondence is received. Based on the incoming message, the appropriate
  * event is emitted.
  *
  * > If a `finish` message is received with data in it, first a `data` event is
  * > emitted, then `finish`. Thus, subscribing to `data` only is enough to get
  * > noitified of every single incoming chunk.
  *
  * @param {Message} message Message received
  *
  * @fires Correspondence#data
  * @fires Correspondence#finish
  * @fires Correspondence#error
  */
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
  * @summary Get the next chunk of incoming data.
  *
  * @description This method returns a promise that is resolved with the next
  * piece of incoming data.
  *
  * If the correspondence is finished during the wait,
  * {@link Correspondence.End|End} will be returned. Otherwise, the data chunk is
  * returned as-is.
  *
  * Additional validations and other operations to apply on the incoming data
  * can be specified in the form of {@link ReadHandler|ReadHandlers}. Every
  * handler will be called in order.
  *
  * > While consuming messages this way, the Correspondence won't emit events.
  *
  * @param {...ReadHandler} handlers Read handlers
  * @returns {Promise<any|Symbol>} Resulting data or End
  *
  * @throws When receiving an error message
  * @throws If Correspondence not readable
  * @throws If any of the handlers throw
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
  * @summary Get all incoming data.
  *
  * @description This method returns an async generator that will yield every
  * incoming chunk of data. Once the correspondence is finished, the generator
  * will finish.
  *
  * Additional validations and other operations to apply on the incoming data
  * can be specified in the form of {@link ReadHandler|ReadHandlers}. Every
  * handler will be called in order.
  *
  * > While consuming messages this way, the Correspondence won't emit events.
  *
  * @param {...ReadHandler} handlers Read handlers
  * @returns {AsyncGenerator} Incoming data
  *
  * @throws When receiving an error message
  * @throws If Correspondence not readable
  * @throws If any of the handlers throw
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

  /**
  * @summary Send data message.
  *
  * @description This method will send a data message. This method can be called
  * 0 or more times. Each call will send a separate message, making it suitable
  * for streaming data, instead of trying to send all of it in one huge message.
  *
  * @param {any} data Data
  * @throws If Correspondence not {@link Correspondence#writable|writable}
  */
  write (data) {
    this.#write(
      this.#makeMessage({ body: data, type: MessageTypes.Data })
    )
  }

  /**
  * @summary Finish correspondence.
  *
  * @description This method will send a finish message, signifying to the
  * recipient to no longer expect any data on this correspondence. A body may or
  * may not be present in this message.
  *
  * After this call, the correspondence will no longer be
  * {@link Correspondence#writable|writable}.
  *
  * @param {any} [data] Response data
  * @throws If Correspondence not {@link Correspondence#writable|writable}
  */
  finish (data) {
    this.#write(
      this.#makeMessage({ body: data, type: MessageTypes.Finish })
    )

    this.#writable = false
  }

  // TODO: Make unwritable if peer disconnects
  /**
  * @summary Finish correspondence with an error.
  *
  * @description This method will send am error message, signifying to the
  * recipient that an error has occurred during processing, and to expect no more
  * data on this correspondence. The error itself will be present as a dedicated
  * field in the response, to convey information to the recipient.
  *
  * After this call, the correspondence will no longer be
  * {@link Correspondence#writable|writable}.
  *
  * @param {MessageError} err Error
  * @throws If Correspondence not {@link Correspondence#writable|writable}
  */
  error (err) {
    this.#write(
      this.#makeMessage({ error: err, type: MessageTypes.Error })
    )

    this.#writable = false
  }

  // TODO: Make unreadable if peer disconnects
  /**
  * @summary Check if correspondence is readable.
  *
  * @description A correspondence is readable as long as it has not received
  * either a finish or an error message. Both of these messages signify that no
  * more data should be expected on this correspondence.
  *
  * @type {boolean}
  */
  get readable () {
    return this.#readable
  }

  /**
  * @summary Get context.
  *
  * @description The correspondence context is an object shared between active
  * {@link ReadHandler|ReadHandlers}, each of which can freely modify it. This
  * is useful for storing data that can be useful later down the line.
  *
  * The context object is tied to the current read. You can access it after the
  * read, but it will be reset when the next read operation begins ( `.next()` or
  * `.all()` ).
  *
  * @type {object}
  */
  get context () {
    return this.#context
  }

  /**
  * @summary Get correspondence header.
  *
  * @description When reading with the correspondence, this field will contain
  * the header of the last message received.
  *
  * When writing, this field will contain the configured header, and will be
  * used as the header of every message sent.
  *
  * @type {MessageHeader}
  */
  get header () {
    return this.#header
  }

  /**
  * @summary Check if correspondence is writable.
  *
  * @description A correspondence is writable as long as it has not sent either
  * a finish or an error message. Both of these messages signify that no more
  * data should be expected on this correspondence.
  *
  * @type {boolean}
  */
  get writable () {
    return this.#writable
  }

  /**
  * Only called internally.
  *
  * @private
  */
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
    if (!this.#writable) {
      throw new UnwritableCorrespondenceError(this)
    }
  }

  #ensureReadable () {
    if (!this.#readable) {
      throw new UnreadableCorrespondenceError(this)
    }
  }

  #makeProxy (target) {
    const handler = {
      get (obj, prop) {
        if (obj[prop] !== undefined && this[prop] !== undefined) {
          return this[prop]
        } else {
          return undefined
        }
      }
    }

    return new Proxy(target, handler)
  }

  /** @private */
  static _proxy (source, target) {
    const handler = {
      get (obj, prop) {
        if (obj[prop] !== undefined && source[prop] !== undefined) {
          const result = source[prop]

          // If result is a method, bind it to source, otherwise return as-is
          return (typeof result === 'function')
            ? result.bind(source)
            : result
        } else {
          return undefined
        }
      }
    }

    return new Proxy(target, handler)
  }
}

/**
* Event emitted whenever a `data` message is received on the correspondence.
*
* Only the response body will be emitted ( which may be `undefined`! ), as the
* header can be queried from the correspondence itself, and shouldn't
* influence processing after the initial message.
*
* @event Correspondence#data
* @type {any}
*/

/**
* Event emitted whenever a `finish` message is received on the correspondence.
*
* This indicates that no more data is to be expected on this correspondence, and
* that it has concluded successfully.
*
* @event Correspondence#finish
*/

/**
* Event emitted whenever an `error` message is received on the correspondence.
*
* This indicates that no more data is to be expected on this correspondence,
* since it has terminated with an error.
*
* @event Correspondence#error
* @type {CorrespondenceError}
*/
