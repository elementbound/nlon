import stream from 'node:stream'
import { safeParse } from './utils.mjs'

export class InspectableStream extends stream.Duplex {
  #writeBuffer = Buffer.alloc(0)
  #readBuffer = Buffer.alloc(0)

  #emitOnInject = false

  /**
  * @param {object} [options]
  * @param {boolean} [options.emitOnInject=false]
  */
  constructor (options) {
    super(options)

    this.#emitOnInject = !!options?.emitOnInject
  }

  _write (chunk, _encoding, next) {
    // NOTE: This is not very fast
    this.#writeBuffer = Buffer.concat([this.#writeBuffer, chunk])

    next()
  }

  _read (size) {
    // NOTE: This is not very fast
    const read = Buffer.from(this.#readBuffer.subarray(0, size))
    this.#readBuffer = Buffer.from(this.#readBuffer.subarray(size))

    this.push(read)
  }

  inject (data) {
    if (!Buffer.isBuffer(data)) {
      data = Buffer.from(data)
    }

    this.#readBuffer = Buffer.concat([this.#readBuffer, data])

    if (this.#emitOnInject) {
      // This needs to be configurable because in the Server tests, *somehow*
      // _read is called apparently, because data is pulled and emitted as
      // 'data' events.
      //
      // However, in the Peer tests, if the event is not manually emitted, the
      // Peer doesn't know about it and the correspondences are not updated.
      this.emit('data', data)
    }
  }

  extract (size) {
    size ??= this.available
    const extracted = Buffer.from(this.#writeBuffer.subarray(0, size))
    this.#writeBuffer = Buffer.from(this.#writeBuffer.subarray(size))

    return extracted
  }

  toString () {
    return this.extract().toString()
  }

  fromJSON () {
    return JSON.parse(this.toString())
  }

  multiJSON () {
    return this.toString()
      .split('\n')
      .filter(line => !!(line.trim()))
      .map(safeParse)
  }

  get available () {
    return this.#writeBuffer.length
  }
}
