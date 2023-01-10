/* eslint-disable no-unused-vars */
import { fail } from 'node:assert'
import stream from 'node:stream'
/* eslint-enable no-unused-vars */

import { Message } from '../protocol.mjs'

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
