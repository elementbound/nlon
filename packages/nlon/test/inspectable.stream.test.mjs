import { describe, it } from 'node:test'
import assert from 'node:assert'
import { InspectableStream } from './inspectable.stream.mjs'

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

  it('write emits event', () => {
    // Given
    const stream = new InspectableStream()
    stream.on('data', data => assert.ok(data))

    // When
    stream.write('Hello')

    // Then listener is called
  })
})
