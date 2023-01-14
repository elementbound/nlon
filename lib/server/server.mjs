/* eslint-disable no-unused-vars */
import stream from 'node:stream'
import { Message, MessageError } from '../protocol.mjs'
/* eslint-enable no-unused-vars */

import assert from 'assert'
import ndjson from 'ndjson'
import pino from 'pino'
import { nanoid } from 'nanoid'
import { Request } from './request.mjs'
import { Response } from './response.mjs'
import { InvalidMessageError, StreamingError } from './error.mjs'

/**
* @typedef {function(Request, Response, object)} RequestHandler
* @callback RequestHandler
* @param {Request} request
* @param {Response} response
* @param {object} context
*/

/**
* @typedef {function(Request, Response, object, any)} RequestExceptionHandler
* @callback RequestExceptionHandler
* @param {Request} request
* @param {Response} response
* @param {object} context
* @param {any} exception
*/

/**
* Default handler returning an error
*
* @param {Request} request
* @param {Response} response
* @param {object} _context
*/
export function unknownSubjectHandler (request, response, _context) {
  response.error(new MessageError({
    type: 'UnknownSubject',
    message: `Unknown subject: ${request.header.subject}`
  }))
}

export function defaultExceptionHandler (_request, response, _context, exception) {
  if (exception.name && exception.message) {
    response.error(exception.name, exception.message)
  } else {
    response.error('UnknownError', '')
  }
}

class StreamContext {
  /** @type {string} */
  id = nanoid()

  /** @type {function(object)} */
  handler

  /** @type {stream.Duplex} */
  stream

  /** @type {stream.Duplex} */
  pipe

  /** @param {StreamContext} options */
  constructor (options) {
    options && Object.assign(this, options)
  }
}

/**
 * @summary Server class
 */
export class Server extends stream.EventEmitter {
  /** @type {Map<string, RequestHandler[]>} */
  #handlers = new Map()

  /** @type {RequestExceptionHandler[]} */
  #exceptionHandlers = [
    defaultExceptionHandler
  ]

  /** @type {RequestHandler[]} */
  #defaultHandlers = [
    unknownSubjectHandler
  ]

  /** @type {Map<stream.Duplex, StreamContext>} */
  #streams = new Map()

  /** @type {pino.Logger} */
  #logger

  constructor (options) {
    super()

    this.#logger = options?.logger ?? pino({ name: 'nlon-server' })

    this.on('error', err =>
      this.#logger.error({ err }, 'Server stream error!'))
  }

  /**
  * Register a request handler.
  *
  * @param {string} subject Subject
  * @param {...RequestHandler} handlers Request handler
  */
  handle (subject, ...handlers) {
    this.#ensureHandler(subject)
    this.#handlers.get(subject).push(...handlers)
  }

  handleException (...handlers) {
    // TODO: Note how exception handlers are called in reverse
    this.#exceptionHandlers.push(...handlers)
  }

  defaultHandlers (...handlers) {
    assert(handlers.length > 0, 'At least one default handler must be present!')

    this.#defaultHandlers = handlers
  }

  /**
  * Configure the server.
  *
  * @param {function(Server)} configurer Configuration function
  */
  configure (configurer) {
    configurer(this)
  }

  /**
  * Connect a stream to the server, listening to its incoming messages.
  *
  * @param {stream.Duplex} stream Stream
  */
  connect (stream) {
    if (this.#streams.has(stream)) {
      return
    }

    const streamContext = new StreamContext({
      stream,
      pipe: stream.pipe(ndjson.parse()),
      handler: data => this.#handleMessage(data, streamContext)
    })

    this.#logger.debug({ id: streamContext.id, stream }, 'Connecting stream')

    streamContext.pipe.on('data', streamContext.handler)
    streamContext.stream.on('error', err => this.emit('error',
      new StreamingError(stream, err))
    )
    streamContext.pipe.on('error', err => this.emit('error',
      new StreamingError(stream, err))
    )

    this.#streams.set(stream, streamContext)
    this.emit('connect', stream)
  }

  /**
  * Disconnect the stream, no longer listening to messages coming from it.
  *
  * @param {stream.Duplex} stream Stream
  */
  disconnect (stream) {
    const streamContext = this.#streams.get(stream)

    if (!streamContext) { return }

    this.#logger.debug({ id: streamContext.id, stream }, 'Disconnecting stream')
    streamContext.pipe.off('data', streamContext.handler)
    this.#streams.delete(stream)
    this.emit('disconnect', stream)
  }

  /**
  * @param {Message} message
  * @param {StreamContext} streamContext
  */
  #handleMessage (message, streamContext) {
    const logger = this.#logger.child({ stream: streamContext.id })
    logger.info({ message }, 'Received message')

    // Validate message
    try {
      assert(message?.header, 'Missing header!')
      assert(message?.header?.correspondenceId?.length > 0,
        'Missing correspondence id!')
      assert(message?.header?.subject?.length > 0, 'Missing subject!')
    } catch (err) {
      logger.error({ message }, 'Received invalid message, emitting error')

      // Emit error event and bail
      this.emit('error',
        new InvalidMessageError(streamContext.stream, message, err.message)
      )

      return
    }

    // Prepare environment
    const request = new Request({
      ...message,
      stream: streamContext.stream
    })

    const response = new Response({
      header: message.header,
      stream: streamContext.stream
    })

    const context = {}

    // Call handlers
    const handlers =
      this.#handlers.get(message.header.subject) ?? this.#defaultHandlers

    handlers === this.#defaultHandlers &&
      logger.warn({ subject: message.header.subject },
        'Message subject unknown, calling default handlers')

    for (const handler of handlers) {
      try {
        handler(request, response, context)
      } catch (err) {
        logger.warn({ err }, 'Caught exception processing message')
        for (let i = 0; i < this.#exceptionHandlers.length; ++i) {
          const idx = this.#exceptionHandlers.length - 1 - i
          const exceptionHandler = this.#exceptionHandlers[idx]
          exceptionHandler(request, response, context, err)

          if (response.isFinished) {
            break
          }
        }
      }

      if (response.isFinished) {
        break
      }
    }
  }

  #ensureHandler (subject) {
    if (!this.#handlers.has(subject)) {
      this.#handlers.set(subject, [])
    }
  }
}
