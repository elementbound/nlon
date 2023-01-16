/* eslint-disable no-unused-vars */
import stream from 'node:stream'
/* eslint-enable no-unused-vars */

import { nanoid } from 'nanoid'

/** @private */
export class StreamContext {
  /** @type {string} */
  id = nanoid()

  /** @type {function(object)} */
  handler

  /** @type {stream.Duplex} */
  stream

  /** @type {stream.Duplex} */
  pipe

  /** @param {StreamContext} options */
  constructor (options) {
    options && Object.assign(this, options)
  }
}
