/* eslint-disable no-unused-vars */
import { fail } from 'node:assert'
import stream from 'node:stream'
/* eslint-enable no-unused-vars */

import { Message } from '../protocol.mjs'

/**
* @summary Request as managed by the server.
*
* @description In essence, a `Request` is a `Message` with additional metadata.
* Request objects are handed to request handlers by the server.
*
* @extends {Message}
*/
export class Request extends Message {
  #stream

  /**
  * Stream the request was received on.
  *
  * @type {stream.Duplex}
  */
  get stream () {
    return this.#stream
  }

  /**
  * Construct a request
  *
  * @param {Request} options Options
  * @param {stream.Duplex} options.stream Stream
  */
  constructor (options) {
    super(options)
    this.#stream = options.stream ?? fail('Missing stream!')
  }
}
