import stream from 'node:stream'

export class InspectableStream extends stream.Duplex {
  #writeBuffer = Buffer.alloc(0)
  #readBuffer = Buffer.alloc(0)

  _write (chunk, encoding, next) {
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
    this.emit('data', data)
  }

  extract (size) {
    size ??= this.available
    const extracted = Buffer.from(this.#writeBuffer.subarray(0, size))
    this.#writeBuffer = Buffer.from(this.#writeBuffer.subarray(size))

    return extracted
  }

  get available () {
    return this.#writeBuffer.length
  }
}
