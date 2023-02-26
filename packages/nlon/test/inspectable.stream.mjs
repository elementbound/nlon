import stream from 'node:stream'
import { safeParse } from './utils.mjs'

export class InspectableStream extends stream.Duplex {
  #writeBuffer = Buffer.alloc(0)

  #recordWrites = false
  #emitOnInject = false

  /**
  * @param {object} [options]
  * @param {boolean} [options.recordWrites=true]
  * @param {boolean} [options.emitOnInject=false]
  */
  constructor (options) {
    super(options)

    this.#recordWrites = options?.recordWrites ?? true
    this.#emitOnInject = options?.emitOnInject ?? false
  }

  _write (chunk, _encoding, next) {
    if (this.#recordWrites) {
      // NOTE: not very fast, but OK for small tests
      this.#writeBuffer = Buffer.concat([this.#writeBuffer, Buffer.from(chunk)])
    }

    next()
  }

  _read (size) {
  }

  inject (data) {
    this.push(data)

    if (this.#emitOnInject) {
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
