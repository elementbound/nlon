import stream from 'node:stream'
import { describe, it } from 'node:test'
import assert from 'node:assert'

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

describe('InspectableStream', () => {
  it('writes can be extracted', () => {
    // Given
    const stream = new InspectableStream()
    const expected = 'Hello world!'

    // When
    stream.write(expected)

    // Then
    const actual = stream.extract().toString()
    assert(actual === expected)
  })

  it('reads can be injected', () => {
    // Given
    const stream = new InspectableStream()
    const expected = 'Hello world!'

    // When
    stream.inject(expected)

    // Then
    const actual = stream.read().toString()
    assert(actual === expected)
  })
})
