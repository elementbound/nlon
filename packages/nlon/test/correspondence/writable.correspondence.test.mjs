import { describe, it, beforeEach, mock } from 'node:test'
import assert from 'node:assert'
import { InspectableStream } from '../inspectable.stream.mjs'
import { MessageError, MessageHeader, MessageTypes } from '../../lib/protocol.mjs'
import { WritableCorrespondence } from '../../lib/correspondence/writable.correspondence.mjs'
import { objectify } from '../utils.mjs'

describe('WritableCorrespondence', () => {
  /** @type {InspectableStream} */
  let stream

  /** @type {MessageHeader} */
  let header

  /** @type {WritableCorrespondence} */
  let correspondence

  beforeEach(() => {
    stream = new InspectableStream()

    header = new MessageHeader({
      subject: 'test'
    })

    correspondence = new WritableCorrespondence({
      stream, header
    })
  })

  // {{{ write
  it('should write data', () => {
    // Given
    const expected = {
      header,
      type: MessageTypes.Data,
      body: 'test'
    }

    // When
    correspondence.write('test')
    const actual = stream.fromJSON()

    // Then
    assert.deepStrictEqual(objectify(actual), objectify(expected))
    assert(correspondence.writable, 'Correspondence should stay writable!')
  })

  it('should write finish with body', () => {
    // Given
    const expected = {
      header,
      type: MessageTypes.Finish,
      body: 'test'
    }

    // When
    correspondence.finish('test')
    const actual = stream.fromJSON()

    // Then
    assert.deepStrictEqual(objectify(actual), objectify(expected))
    assert(!correspondence.writable)
  })

  it('should write finish without body', () => {
    // Given
    const expected = {
      header,
      type: MessageTypes.Finish
    }

    // When
    correspondence.finish()
    const actual = stream.fromJSON()

    // Then
    assert.deepStrictEqual(objectify(actual), objectify(expected))
    assert(!correspondence.writable)
  })

  it('should write error', () => {
    // Given
    const expected = {
      header,
      type: MessageTypes.Error,
      error: {
        type: 'Error',
        message: 'Test error'
      }
    }

    // When
    correspondence.error(new MessageError({
      type: 'Error',
      message: 'Test error'
    }))
    const actual = stream.fromJSON()

    // Then
    assert.deepStrictEqual(objectify(actual), objectify(expected))
    assert(!correspondence.writable)
  })
  // }}}

  // {{{ events
  it('should emit close on finish', () => {
    // Given
    const closeHandler = mock.fn()
    correspondence.on('close', closeHandler)

    // When
    correspondence.finish()

    // Then
    assert.equal(closeHandler.mock.callCount(), 1, 'No close event emitted!')
  })

  it('should emit close on error', () => {
    // Given
    const closeHandler = mock.fn()
    correspondence.on('close', closeHandler)

    // When
    correspondence.error(new MessageError({
      type: 'Error',
      message: 'Test error'
    }))

    // Then
    assert.equal(closeHandler.mock.callCount(), 1, 'No close event emitted!')
  })
  // }}}

  // {{{ throw
  it('should throw on finished write', () => {
    // Given
    correspondence.finish()

    // When + Then
    assert.throws(() => correspondence.write('test'))
  })

  it('should throw on finished finish', () => {
    // Given
    correspondence.finish()

    // When + Then
    assert.throws(() => correspondence.finish('test'))
  })

  it('should throw on errored write', () => {
    // Given
    correspondence.error(new MessageError({ type: 'test', message: 'test' }))

    // When + Then
    assert.throws(() => correspondence.write('test'))
  })

  it('should throw on errored finish', () => {
    // Given
    correspondence.error(new MessageError({ type: 'test', message: 'test' }))

    // When + Then
    assert.throws(() => correspondence.finish('test'))
  })
  // }}}

  // {{{ wrap
  it('should finish when wrap proxy is finished', () => {
    // Given
    const writable = WritableCorrespondence.wrap(correspondence)

    // When
    writable.finish()

    // Then
    assert(!writable.writable, 'Proxy still writable!')
    assert(!correspondence.writable, 'Correspondence still writable!')
  })
  // }}}
})
