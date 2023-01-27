import { describe, it, beforeEach, mock } from 'node:test'
import assert from 'node:assert'
import { Server } from '../../lib/server/server.mjs'
import { InspectableStream } from '../inspectable.stream.mjs'
import { Message, MessageError, MessageHeader, MessageTypes } from '../../lib/protocol.mjs'
import { StreamingError, InvalidMessageError } from '../../lib/error.mjs'
import { objectify, send, sleep } from '../utils.mjs'

describe('Server', () => {
  /** @type {Server} */
  let server

  /** @type {InspectableStream} */
  let stream

  beforeEach(() => {
    server = new Server()

    stream = new InspectableStream()
    server.connect(stream)
  })

  it('should call all handlers', async () => {
    // Given
    const handlers = [
      mock.fn(),
      mock.fn(),
      mock.fn((_request, response, _context) => response.finish())
    ]

    server.handle('test', ...handlers)

    // When
    await send(stream, new Message({
      header: new MessageHeader({
        subject: 'test'
      })
    }))

    // Then
    handlers.every(handler =>
      assert.equal(handler.mock.callCount(), 1, 'Handler was not called!')
    )
  })

  it('should await async handlers', async () => {
    // Given
    const delay = 50
    const correspondenceId = 'test-id'
    const subject = 'test-ASnc'

    const asyncHandler = async (_request, response) => {
      await sleep(delay)
      response.write('Hello')
    }

    const syncHandler = (_request, response) => {
      response.finish('world!')
    }

    const expected = [
      new Message({
        header: {
          subject,
          correspondenceId
        },

        type: MessageTypes.Data,
        body: 'Hello'
      }),
      new Message({
        header: {
          subject,
          correspondenceId
        },

        type: MessageTypes.Finish,
        body: 'world!'
      })
    ]

    server.handle(subject, asyncHandler, syncHandler)

    // When
    send(stream, new Message({
      header: new MessageHeader({
        subject,
        correspondenceId
      })
    }))
    await sleep(delay + 10)

    // Then
    const actual = stream.multiJSON()

    assert.deepStrictEqual(
      actual.map(objectify),
      expected.map(objectify),
      'Responses don\'t match expected order or content!')
  })

  it('should stop handlers after response is finished', async () => {
    // Given
    const handlers = [
      mock.fn(),
      mock.fn((_request, response, _context) => response.finish()),
      mock.fn()
    ]

    server.handle('test-finish', ...handlers)

    // When
    await send(stream, new Message({
      header: new MessageHeader({
        subject: 'test-finish'
      })
    }))

    // Then
    assert.equal(handlers[0].mock.callCount(), 1,
      'First handler was not called!')
    assert.equal(handlers[1].mock.callCount(), 1,
      'Second handler was not called!')
    assert.equal(handlers[2].mock.callCount(), 0,
      'Third handler was called!')
  })

  it('should stop handlers after response is errored', async () => {
    // Given
    const handlers = [
      mock.fn(),
      mock.fn((_request, response, _context) =>
        response.error(new MessageError({ type: 'test', message: 'test' }))),
      mock.fn()
    ]

    server.handle('test-error', ...handlers)

    // When
    await send(stream, new Message({
      header: new MessageHeader({
        subject: 'test-error'
      })
    }))

    // Then
    assert.equal(handlers[0].mock.callCount(), 1,
      'First handler was not called!')
    assert.equal(handlers[1].mock.callCount(), 1,
      'Second handler was not called!')
    assert.equal(handlers[2].mock.callCount(), 0,
      'Third handler was called!')
  })

  it('should emit error on unfinished response', async () => {
    // Given
    const handlers = [
      mock.fn(),
      mock.fn()
    ]

    const errorListener = mock.fn()

    server.handle('test-unfinished', ...handlers)
    server.on('error', errorListener)

    // When
    await send(stream, new Message({
      header: new MessageHeader({
        subject: 'test-unfinished'
      })
    }))

    // Then
    assert(errorListener.mock.callCount(), 'No error was emitted!')
  })

  it('should call default handlers', async () => {
    // Given
    const defaultHandlers = [
      mock.fn(),
      mock.fn((_request, response, _context) => response.finish())
    ]

    server.defaultHandlers(...defaultHandlers)

    // When
    await send(stream, new Message({
      header: new MessageHeader({
        subject: 'unknown'
      })
    }))

    // Then
    defaultHandlers.forEach(handler =>
      assert.equal(handler.mock.callCount(), 1,
        'Default handler was not called!'
      ))
  })

  it('should call exception handlers', async () => {
    // Given
    const exceptionHandlers = [
      mock.fn((_request, response, _context) => response.finish()),
      mock.fn()
    ]

    server.handleException(...exceptionHandlers)
    server.handle('test-exception', () => { throw new Error('test') })

    // When
    await send(stream, new Message({
      header: new MessageHeader({
        subject: 'test-exception'
      })
    }))

    // Then
    assert(exceptionHandlers[0].mock.callCount(),
      'First exception handler not called!')
    assert(exceptionHandlers[1].mock.callCount(),
      'Second exception handler not called!')
  })
  it('should stop exception handlers after response is finished', async () => {
    // Given
    const exceptionHandlers = [
      mock.fn(),
      mock.fn((_request, response) => response.finish())
    ]

    server.handleException(...exceptionHandlers)
    server.handle('test-exception', () => { throw new Error('test') })

    // When
    await send(stream, new Message({
      header: new MessageHeader({
        subject: 'test-exception'
      })
    }))

    // Then
    assert(!exceptionHandlers[0].mock.callCount(),
      'First exception handler called!')
    assert(exceptionHandlers[1].mock.callCount(),
      'Second exception handler not called!')
  })

  it('should stop exception handlers after response is error', async () => {
    // Given
    const exceptionHandlers = [
      mock.fn(),
      mock.fn((_request, response) =>
        response.error(new MessageError({ type: 'test', message: 'test' })))
    ]

    server.handleException(...exceptionHandlers)
    server.handle('test-exception', () => { throw new Error('test') })

    // When
    await send(stream, new Message({
      header: new MessageHeader({
        subject: 'test-exception'
      })
    }))

    // Then
    assert(!exceptionHandlers[0].mock.callCount(),
      'First exception handler called!')
    assert(exceptionHandlers[1].mock.callCount(),
      'Second exception handler not called!')
  })

  it('should configure', () => {
    // Given
    const configurer = mock.fn()

    // When
    server.configure(configurer)

    // Then
    assert.equal(configurer.mock.callCount(), 1, 'Configurer was not called!')
  })

  it('should not listen after disconnect', async () => {
    // Given
    server.defaultHandlers(() => assert.fail('Handler was called!'))
    server.disconnect(stream)

    // When
    await send(stream, new Message({
      header: new MessageHeader({
        subject: 'test'
      })
    }))

    // Then fail if handled
  })

  it('should reject malformed message', async () => {
    // Given
    const handler = mock.fn()
    const invalidJson = '{ "header": {'

    server.on('error', handler)

    // When
    await send(stream, invalidJson)

    // Then
    const calls = handler.mock.calls
    assert.equal(calls.length, 1, 'No error was emitted?')
    assert(calls[0]?.arguments?.[0] instanceof StreamingError,
      'Wrong error emitted!')
  })

  it('should reject invalid message', async () => {
    // Given
    const handler = mock.fn()
    server.on('error', handler)
    const invalidMessage = {}

    // When
    await send(stream, invalidMessage)

    // Then
    const calls = handler.mock.calls
    assert.equal(calls.length, 1, 'No error was emitted?')
    assert(calls[0]?.arguments?.[0] instanceof InvalidMessageError,
      'Wrong error emitted!')
  })

  it('should emit on connect', () => {
    // Given
    const handler = mock.fn()
    server.on('connect', handler)

    // When
    server.connect(new InspectableStream())

    // Then
    assert.equal(handler.mock.callCount(), 1, 'No event was emitted!')
  })

  it('should emit on disconnect', () => {
    // Given
    const handler = mock.fn()
    server.on('disconnect', handler)

    // When
    server.disconnect(stream)

    // Then
    assert.equal(handler.mock.callCount(), 1, 'No event was emitted!')
  })

  it('should disconnect on close', () => {
    // Given
    const handler = mock.fn()
    server.on('disconnect', handler)

    // When
    stream.emit('close')

    // Then
    assert.equal(handler.mock.callCount(), 1, 'No event was emitted!')
  })
})
