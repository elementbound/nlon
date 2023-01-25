/* eslint-disable no-unused-vars */
import { Message, MessageError, MessageHeader, MessageTypes } from '../protocol.mjs'
/* eslint-enable no-unused-vars */

import stream from 'stream'
import assert, { fail } from 'node:assert'
import { CorrespondenceError } from '../error.mjs'

// TODO: Try and consolidate correspondence API between client and server
/**
* @summary An incoming correspondence, as managed by the client.
*
* @description Correspondence instances are used to manage incoming messages
* belonging to the instance's correspondence. This provides an interface to
* listen to incoming data and handle correspondence finish and error events.
*
* In addition, a correspondence can be *gathered*, meaning that any incoming
* data is buffered into memory and can be retrieved at any time. This can spare
* the effort of manually registering a handler and saving incoming data into an
* array.
*
* Gathering is off by default to avoid unnecessary memory consumption.
*
* There's also multiple `promise*` methods, each being useful for async methods
* awaiting on certain correspondence events.
*/
export class IncomingCorrespondence extends stream.EventEmitter {
  /** @type {stream.Duplex} */
  #stream

  /** @type {MessageHeader} */
  #header

  /** @type {boolean} */
  #isFinished = false

  /** @type {any[]} */
  #chunks = undefined

  /** @type {boolean} */
  #isGathering = false

  /**
  * Construct correspondence.
  *
  * @param {stream.Duplex} stream Stream
  * @param {MessageHeader} header Incoming message's header
  */
  constructor (stream, header) {
    super()
    this.#stream = stream ?? fail('Missing stream!')
    this.#header = header ?? fail('Missing header!')
  }

  /**
  * @summary Handle message.
  *
  * @description This method called from the outside, typically by the `Client`,
  * when a message belonging to this instance's correspondence is received.
  * Based on the incoming message, the appropriate event is emitted.
  *
  * @param {Message} message Message received
  *
  * @fires IncomingCorrespondence#data
  * @fires IncomingCorrespondence#finish
  * @fires IncomingCorrespondence#error
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
      this.emit('error', new CorrespondenceError(message.error))
    }
  }

  /**
  * @summary Toggle gathering.
  *
  * @description When gathering is enabled, every piece of data received will be
  * stored into memory, retrievable with `.chunks`.
  *
  * @param {boolean} [enable=true] Gather toggle
  */
  gather (enable) {
    this.#isGathering = enable ?? true

    if (this.#isGathering) {
      this.#chunks ??= []
    } else if (!this.#isGathering) {
      this.#chunks = undefined
    }
  }

  /**
  * @summary Await the correspondence's finish.
  *
  * @description The promise will resolve once a `finish` message is received,
  * or reject on an `error` message.
  *
  * @returns {Promise<void>} Promise
  */
  promise () {
    return new Promise((resolve, reject) => {
      this.once('finish', resolve)
      this.once('error', reject)
    })
  }

  /**
  * @summary Await the first piece of data.
  *
  * @description The promise will resolve on the first `data` message, or reject
  * on the first `error` message - whichever happens earlier.
  *
  * The promise may never resolve if neither an `error` or `data` event is
  * received.
  *
  * @returns {Promise<any>} Promise
  */
  // TODO: Resolve with `undefined` on finish
  promiseSingle () {
    return new Promise((resolve, reject) => {
      this.once('data', resolve)
      this.once('error', reject)
    })
  }

  /**
  * @summary Await correspondence data.
  *
  * @description This method will enable gathering and return a promise that
  * resolves on `finish` or rejects on `error`. If the correspondence finishes
  * successfully, all the gathered chunks of data will be resolved by the
  * promise.
  *
  * @returns {Promise<any[]>} Promise with all response data
  */
  promiseAll () {
    this.gather()
    return new Promise((resolve, reject) => {
      this.once('finish', () => resolve(this.#chunks))
      this.once('error', reject)
    })
  }

  /**
  * The stream this correspondence is happening on.
  *
  * @type {stream.Duplex}
  */
  get stream () {
    return this.#stream
  }

  /**
  * The header identifying the correspondence.
  *
  * @type {MessageHeader}
  */
  get header () {
    return this.#header
  }

  /**
  * Whether this correspondence has concluded, either successfully or by an
  * error.
  *
  * @type {boolean}
  */
  get isFinished () {
    return this.#isFinished
  }

  /**
  * Whether gathering is enabled.
  *
  * @type {boolean}
  */
  get isGathering () {
    return this.#isGathering
  }

  /**
  * @summary Chunks of data received so far.
  *
  * @description **Note:** Trying to get `chunks` with gathering disabled is
  * considered an error and will throw an exception.
  *
  * @type {any[]}
  */
  get chunks () {
    assert(this.#isGathering, 'Can\'t get chunks if not gathering!')
    return this.#chunks
  }
}

/**
* Event emitted whenever a `data` message is received on the correspondence.
*
* Only the response body will be emitted ( which may be `undefined`! ), as the
* header can be queried from the correspondence itself, and shouldn't
* influence processing after the initial message.
*
* @event IncomingCorrespondence#data
* @type {any}
*/

/**
* Event emitted whenever a `finish` message is received on the correspondence.
*
* This indicates that no more data is to be expected on this correspondence, and
* that it has concluded successfully.
*
* @event IncomingCorrespondence#finish
*/

/**
* Event emitted whenever an `error` message is received on the correspondence.
*
* This indicates that no more data is to be expected on this correspondence,
* since it has terminated with an error.
*
* @event IncomingCorrespondence#error
* @type {MessageError}
*/
