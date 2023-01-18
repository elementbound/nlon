import { describe, it, beforeEach, mock } from 'node:test'
import assert from 'node:assert'
import stream from 'node:stream'
import { IncomingCorrespondence } from '../../lib/client/correspondence.mjs'
import { Message, MessageError, MessageHeader, MessageTypes } from '../../lib/protocol.mjs'

describe('IncomingCorrespondence', () => {
  /** @type {IncomingCorrespondence} */
  let correspondence

  /** @type {MessageHeader} */
  let header

  beforeEach(() => {
    header = new MessageHeader()
    correspondence = new IncomingCorrespondence(new stream.PassThrough(), header)
  })

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
    assert.deepStrictEqual(calls[0].arguments, [expected, false],
      'Wrong data was emitted!')
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
      dataHandler.mock.calls[0]?.arguments, [expected, true],
      'Data event wasn\'t emitted!'
    )

    assert.equal(finishHandler.mock.callCount(), 1, 'No finish event emitted!')
  })

  it('should emit error', () => {
    // Given
    const handler = mock.fn()
    correspondence.on('error', handler)

    const error = new MessageError({ type: 'TestError', message: 'test' })

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
    assert.deepStrictEqual(handler.mock.calls[0].arguments, [error])
  })

  it('should gather', () => {
    // Given
    const chunks = [
      'hello',
      'world'
    ]

    const messages = chunks.map(chunk => new Message({
      header: new MessageHeader({ subject: 'test' }),
      type: MessageTypes.Data,
      body: chunk
    }))

    // When
    correspondence.gather()
    messages.forEach(message => correspondence.handle(message))

    // Then
    assert(correspondence.isGathering, 'Correspondence not gathering!')
    assert.deepStrictEqual(correspondence.chunks, chunks,
      'Wrong chunks gathered!')
  })

  it('should throw if not gathering', () => {
    // Given
    correspondence.gather(false)

    // When + Then throw
    assert.throws(() => correspondence.chunks, 'Chunks didn\'t throw!')
  })

  it('should return on promise', async () => {
    // Given
    const promise = correspondence.promise()

    // When
    correspondence.handle(new Message({
      header: new MessageHeader({ subject: 'test' }),
      type: MessageTypes.Finish
    }))

    // Then
    await promise
    assert.ok('pass')
  })

  it('should throw on promise', async () => {
    // Given
    const promise = correspondence.promise()
    const error = new MessageError({ type: 'Test', message: 'test' })

    // When
    correspondence.handle(new Message({
      header: new MessageHeader({ subject: 'test' }),
      type: MessageTypes.Error,
      error
    }))

    // Then
    await assert.rejects(promise)
  })

  it('should return chunk on promiseSingle', async () => {
    // Given
    const promise = correspondence.promiseSingle()
    const expected = 'hello'

    // When
    correspondence.handle(new Message({
      header: new MessageHeader({ subject: 'test' }),
      type: MessageTypes.Data,
      body: expected
    }))

    // Then
    assert.equal(await promise, expected, 'Wrong chunk returned!')
  })

  it('should throw on promiseSingle', async () => {
    // Given
    const promise = correspondence.promiseSingle()
    const error = new MessageError({ type: 'Test', message: 'test' })

    // When
    correspondence.handle(new Message({
      header: new MessageHeader({ subject: 'test' }),
      type: MessageTypes.Error,
      error
    }))

    // Then
    await assert.rejects(promise)
  })

  it('should return chunks on promiseAll', async () => {
    // Given
    const chunks = [
      'hello',
      'world'
    ]

    const messages = chunks.map(chunk => new Message({
      header: new MessageHeader({ subject: 'test' }),
      type: MessageTypes.Data,
      body: chunk
    }))

    // When
    const promise = correspondence.promiseAll()
    messages.forEach(message => correspondence.handle(message))
    correspondence.handle(new Message({
      header: new MessageHeader({ subject: 'test' }),
      type: MessageTypes.Finish
    }))

    // Then
    assert.deepStrictEqual(await promise, chunks, 'Wrong chunks returned!')
  })

  it('should throw on promiseAll', async () => {
    // Given
    const promise = correspondence.promiseAll()
    const error = new MessageError({ type: 'Test', message: 'test' })

    // When
    correspondence.handle(new Message({
      header: new MessageHeader({ subject: 'test' }),
      type: MessageTypes.Error,
      error
    }))

    // Then
    await assert.rejects(promise)
  })
})
