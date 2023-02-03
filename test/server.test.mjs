import { describe, it, beforeEach, mock } from 'node:test'
import assert from 'node:assert'
import { Server } from '../lib/server.mjs'
import { InspectableStream } from './inspectable.stream.mjs'
import { Message, MessageError, MessageHeader, MessageTypes } from '../lib/protocol.mjs'
import { StreamingError, InvalidMessageError } from '../lib/error.mjs'
import { objectify, send, sleep } from './utils.mjs'

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

  // {{{ Correspondence handler
  it('should call handler', async () => {
    // Given
    const handler = mock.fn()
    server.handle('test', handler)

    // When
    await send(stream, new Message({
      header: new MessageHeader({
        subject: 'test'
      })
    }))

    // Then
    assert.equal(handler.mock.callCount(), 1, 'Handler was not called!')
  })

  it('should emit error on unfinished response', async () => {
    // Gven
    const handler = mock.fn()
    const errorListener = mock.fn()

    server.handle('test-unfinished', handler)
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

  it('should call default handler', async () => {
    // Given
    const defaultHandler = mock.fn()
    server.defaultHandler(defaultHandler)

    // When
    await send(stream, new Message({
      header: new MessageHeader({
        subject: 'unknown'
      })
    }))

    // Then
    assert.equal(defaultHandler.mock.callCount(), 1,
      'Default handler was not called!'
    )
  })
  // }}}

  // {{{ Exception handlers
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

  it('should await exception handlers', async () => {
    // Given
    const delay = 50
    const exceptionHandlers = [
      mock.fn(),
      mock.fn(async (_request, response) => {
        await sleep(delay)
        response.finish()
      })
    ]

    server.handleException(...exceptionHandlers)
    server.handle('test-exception', () => { throw new Error('test') })

    // When
    await send(stream, new Message({
      header: new MessageHeader({
        subject: 'test-exception'
      })
    }))
    await sleep(delay + 10)

    // Then
    assert(!exceptionHandlers[0].mock.callCount(),
      'First exception handler called!')
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

  it('should send default response on exception handler error', async () => {
    // Given
    server.handleException(() => { throw new Error('test') })
    server.handle('test-exception-error', () => { throw new Error('test') })

    const header = new MessageHeader({
      subject: 'test-exception-error'
    })

    const expected = new Message({
      header,
      type: MessageTypes.Error,
      error: new MessageError({
        type: 'GenericError',
        message: 'Failed processing correspondence'
      })
    })

    // When
    await send(stream, new Message({
      header
    }))

    // Then
    const actual = stream.fromJSON()
    assert.deepStrictEqual(objectify(actual), objectify(expected))
  })
  // }}}

  // {{{ Message reject
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
  // }}}

  // {{{ Events
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
  // }}}

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
    server.defaultHandler(() => assert.fail('Handler was called!'))
    server.disconnect(stream)

    // When
    await send(stream, new Message({
      header: new MessageHeader({
        subject: 'test'
      })
    }))

    // Then fail if handled
  })
})
