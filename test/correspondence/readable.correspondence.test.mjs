import { describe, it, beforeEach, mock } from 'node:test'
import assert from 'node:assert'
import { Message, MessageError, MessageHeader, MessageTypes } from '../../lib/protocol.mjs'
import { ReadableCorrespondence } from '../../lib/correspondence/readable.correspondence.mjs'
import { CorrespondenceError } from '../../lib/error.mjs'
import { objectify } from '../utils.mjs'

describe('ReadableCorrespondence', () => {
  /** @type {ReadableCorrespondence} */
  let correspondence

  /** @type {MessageHeader} */
  let header

  beforeEach(() => {
    header = new MessageHeader()
    correspondence = new ReadableCorrespondence({
      header
    })
  })

  // {{{ Events
  it('should emit data', () => {
    // Given
    const handler = mock.fn()
    correspondence.on('data', handler)

    const expected = 'test data'

    // When
    correspondence.handle(new Message({
      header: new MessageHeader({
        subject: 'test'
      }),

      type: MessageTypes.Data,

      body: expected
    }))

    // Then
    const calls = handler.mock.calls
    assert.equal(calls?.length, 1, 'No event was emitted!')
    assert.deepStrictEqual(calls[0].arguments, [expected, false])
  })

  it('should emit finish', () => {
    // Given
    const handler = mock.fn()
    correspondence.on('finish', handler)

    // When
    correspondence.handle(new Message({
      header: new MessageHeader({
        subject: 'test'
      }),

      type: MessageTypes.Finish
    }))

    // Then
    assert.equal(handler.mock.callCount(), 1, 'No event was emitted!')
  })

  it('should emit data and finish', () => {
    // Given
    const dataHandler = mock.fn()
    const finishHandler = mock.fn()

    correspondence.on('data', dataHandler)
    correspondence.on('finish', finishHandler)

    const expected = 'test data'

    // When
    correspondence.handle(new Message({
      header: new MessageHeader({
        subject: 'test'
      }),

      type: MessageTypes.Finish,

      body: expected
    }))

    // Then
    assert.equal(dataHandler.mock.callCount(), 1, 'No data event was emitted!')
    assert.deepStrictEqual(
      dataHandler.mock.calls[0]?.arguments, [expected, true]
    )

    assert.equal(finishHandler.mock.callCount(), 1, 'No finish event emitted!')
  })

  it('should emit error', () => {
    // Given
    const handler = mock.fn()
    correspondence.on('error', handler)

    const error = new MessageError({ type: 'TestError', message: 'test' })
    const expected = new CorrespondenceError(error)

    // When
    correspondence.handle(new Message({
      header: new MessageHeader({
        subject: 'test'
      }),

      type: MessageTypes.Error,
      error
    }))

    // Then
    assert.equal(handler.mock.callCount(), 1, 'No error event was emitted!')
    assert.deepStrictEqual(handler.mock.calls[0].arguments, [expected])
  })

  /// }}}

  // {{{ next
  it('should return chunk on next', async () => {
    // Given
    const expected = 'chunk'
    const message = new Message({
      header,
      type: MessageTypes.Data,
      body: expected
    })

    // When
    const actual = correspondence.next()
    correspondence.handle(message)

    // Then
    assert.deepEqual(objectify(await actual), objectify(expected))
  })

  it('should return symbol on next', async () => {
    // Given
    const expected = ReadableCorrespondence.End
    const message = new Message({
      header,
      type: MessageTypes.Finish
    })

    // When
    const actual = correspondence.next()
    correspondence.handle(message)

    // Then
    assert.equal(await actual, expected)
  })

  it('should call handlers on next', async () => {
    // Given
    const data = 'test'
    const message = new Message({
      header,
      type: MessageTypes.Data,
      body: data
    })

    const handlers = [
      mock.fn(),
      mock.fn(),
      mock.fn()
    ]

    const expectedArguments = [data, header, {}]

    // When
    const promise = correspondence.next(...handlers)
    correspondence.handle(message)
    await promise

    // Then
    handlers.forEach(handler => {
      assert.equal(handler.mock.callCount(), 1)
      assert.deepStrictEqual(handler.mock.calls[0].arguments, expectedArguments)
    })
  })

  it('should throw on next if handler throws', async () => {
    // Given
    const message = new Message({
      header,
      type: MessageTypes.Data,
      body: 'chunk'
    })

    const handler = () => { throw new Error('test') }

    // When
    const promise = correspondence.next(handler)
    correspondence.handle(message)

    // Then
    await assert.rejects(promise)
  })

  it('should throw on next if error', async () => {
    // Given
    const message = new Message({
      header,
      type: MessageTypes.Error,
      error: new MessageError({ type: 'test', message: 'test' })
    })

    // When
    const promise = correspondence.next()
    correspondence.handle(message)

    // Then
    await assert.rejects(promise)
  })

  it('should throw on next if unreadable', async () => {
    // When
    correspondence.handle(new Message({ header, type: MessageTypes.Finish }))

    // Then
    assert(!correspondence.readable, 'Correspondence still readable!')
    await assert.rejects(correspondence.next())
  })
  // }}}

  // {{{all
  it('should return chunks on all', async () => {
    // Given
    const chunks = ['hello', 'world']
    const messages = chunks.map(chunk => new Message({
      header,
      type: MessageTypes.Data,
      body: chunk
    }))
    const finishMessage = new Message({ header, type: MessageTypes.Finish })

    // When
    const generator = correspondence.all()

    // Then
    for (const message of messages) {
      const promise = generator.next()
      correspondence.handle(message)
      const actual = await promise
      const expected = { done: false, value: message.body }
      assert.deepStrictEqual(actual, expected)
    }

    const promise = generator.next()
    correspondence.handle(finishMessage)
    const actual = await promise
    const expected = { done: true, value: undefined }
    assert.deepStrictEqual(actual, expected)
  })

  it('should call handlers on all', async () => {
    // Given
    const message = new Message({
      header,
      type: MessageTypes.Finish,
      body: 'test'
    })

    const handlers = [
      mock.fn(),
      mock.fn()
    ]

    const expectedArguments = ['test', header, {}]

    // When
    const generator = correspondence.all(...handlers)
    const promise = generator.next()
    correspondence.handle(message)
    await promise

    // Then
    handlers.forEach(handler => {
      assert.equal(handler.mock.callCount(), 1, 'Handler was not called!')
      assert.deepStrictEqual(handler.mock.calls[0].arguments, expectedArguments)
    })
  })

  it('should throw on all if handler throws', async () => {
    // Given
    const message = new Message({
      header,
      type: MessageTypes.Finish,
      body: 'test'
    })

    const handler = () => { throw new Error('test') }

    // When
    const generator = correspondence.all(handler)
    const promise = generator.next()
    correspondence.handle(message)

    // Then
    await assert.rejects(promise)
  })

  it('should throw on all if error', async () => {
    // Given
    const message = new Message({
      header,
      type: MessageTypes.Error,
      error: new MessageError({ type: 'test', message: 'test' })
    })

    // When
    const generator = correspondence.all()
    const promise = generator.next()
    correspondence.handle(message)

    // Then
    assert.rejects(promise)
  })

  it('should throw on all if unreadable', async () => {
    // Given
    correspondence.handle(new Message({ header, type: MessageTypes.Finish }))

    // When
    const generator = correspondence.all()
    const promise = generator.next()

    // Then
    assert.rejects(promise)
  })
  // }}}
})
