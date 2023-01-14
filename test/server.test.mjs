import { describe, it, beforeEach, mock } from 'node:test'
import assert from 'node:assert'
import { Server } from '../lib/server/server.mjs'
import { InspectableStream } from './inspectable.stream.mjs'
import { Message, MessageHeader } from '../lib/protocol.mjs'

const invalidMessages = [
  {}, // missing header
  { header: {} }, // missing correspondenceId
  { header: { correspondenceId: '' } }, // empty correspondenceId
  { header: { subject: '' } } // empty subject
]

function send (stream, message) {
  console.log('Sending message', JSON.stringify(message) + '\n')
  stream.inject(JSON.stringify(message) + '\n')
}

describe('Server', { only: true }, () => {
  /** @type {Server} */
  let server

  /** @type {InspectableStream} */
  let stream

  beforeEach(() => {
    server = new Server()

    stream = new InspectableStream()
    server.connect(stream)
  })

  it('should call all handlers', () => {
    // Given
    const handlers = [
      mock.fn(),
      mock.fn(),
      mock.fn()
    ]

    server.handle('test', ...handlers)

    // When
    send(stream, new Message({
      header: new MessageHeader({
        subject: 'test'
      })
    }))

    // Then
    handlers.every(handler =>
      assert.equal(handler.mock.callCount(), 1, 'Handler was not called!')
    )
  })

  it('should stop handlers after response is finished', () => {
    // Given
    const handlers = [
      mock.fn(),
      mock.fn((_request, response, _context) => response.finish()),
      mock.fn()
    ]

    server.handle('test-finish', ...handlers)

    // When
    send(stream, new Message({
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
  it('should stop handlers after response is errored', () => {
    // Given
    const handlers = [
      mock.fn(),
      mock.fn((_request, response, _context) => response.error('test', 'test')),
      mock.fn()
    ]

    server.handle('test-error', ...handlers)

    // When
    send(stream, new Message({
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

  it('should call default handlers', () => {
    // Given
    const defaultHandlers = [
      mock.fn(),
      mock.fn()
    ]

    server.defaultHandlers(...defaultHandlers)

    // When
    send(stream, new Message({
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

  it('should call exception handlers', () => {
    // Given
    const exceptionHandlers = [
      mock.fn(),
      mock.fn()
    ]

    server.handleException(...exceptionHandlers)
    server.handle('test-exception', () => { throw new Error('test') })

    // When
    send(stream, new Message({
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
  it('should stop exception handlers after response is finished', () => {
    // Given
    const exceptionHandlers = [
      mock.fn(),
      mock.fn((_request, response) => response.finish())
    ]

    server.handleException(...exceptionHandlers)
    server.handle('test-exception', () => { throw new Error('test') })

    // When
    send(stream, new Message({
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

  it('should stop exception handlers after response is error', () => {
    // Given
    const exceptionHandlers = [
      mock.fn(),
      mock.fn((_request, response) => response.error('test', 'test'))
    ]

    server.handleException(...exceptionHandlers)
    server.handle('test-exception', () => { throw new Error('test') })

    // When
    send(stream, new Message({
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

  it('should not listen after disconnect', () => {
    // Given
    server.defaultHandlers(() => assert.fail('Handler was called!'))
    server.disconnect(stream)

    // When
    send(stream, new Message({
      header: new MessageHeader({
        subject: 'test'
      })
    }))

    // Then fail if handled
  })

  it('should reject invalid message', () => {
    assert.fail('todo')
  })
})
