import { describe, it, beforeEach, mock } from 'node:test'
import assert from 'node:assert'
import { InspectableStream } from '../inspectable.stream.mjs'
import { Response } from '../../lib/server/response.mjs'
import { Message, MessageError, MessageTypes } from '../../lib/protocol.mjs'

describe('Response', () => {
  /** @type {InspectableStream} */
  let stream

  /** @type {Response} */
  let response

  beforeEach(() => {
    stream = new InspectableStream()
    response = new Response({
      header: {
        correspondenceId: 'test-01',
        subject: 'test'
      },

      stream
    })
  })

  it('should write data', () => {
    // Given
    const expected = {
      header: response.header,
      type: MessageTypes.Data,
      body: 'test'
    }

    // When
    response.write('test')
    const actual = stream.fromJSON()

    // Then
    assert.deepEqual(actual, expected)
    assert(!response.isFinished)
  })

  it('should write finish', () => {
    // Given
    const expected = {
      header: response.header,
      type: MessageTypes.Finish,
      body: 'test'
    }

    // When
    response.finish('test')
    const actual = stream.fromJSON()

    // Then
    assert.deepEqual(actual, expected)
    assert(response.isFinished)
  })

  it('should write error', () => {
    // Given
    const expected = {
      header: response.header,
      type: MessageTypes.Error,
      error: {
        type: 'Error',
        message: 'Test error'
      }
    }

    // When
    response.error(new MessageError({
      type: 'Error',
      message: 'Test error'
    }))
    const actual = stream.fromJSON()

    // Then
    assert.deepEqual(actual, expected)
    assert(response.isFinished)
  })

  it('should throw on finished write', () => {
    // Given
    response.finish()

    // When + Then
    assert.throws(() => response.write('test'))
  })

  it('should throw on finished finish', () => {
    // Given
    response.finish()

    // When + Then
    assert.throws(() => response.finish('test'))
  })

  it('should throw on finished finish', () => {
    // Given
    response.finish()

    // When + Then
    assert.throws(() => response.finish(new MessageError({
      type: 'Test',
      message: 'Test error'
    })))
  })
})
