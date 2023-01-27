/* eslint-disable no-unused-vars */
import stream from 'node:stream'
import { Message, MessageError } from '../protocol.mjs'
/* eslint-enable no-unused-vars */

import assert from 'assert'
import ndjson from 'ndjson'
import pino from 'pino'
import { Request } from './request.mjs'
import { Response } from './response.mjs'
import { InvalidMessageError, StreamingError, UnfinishedResponseError } from '../error.mjs'
import { StreamContext } from '../stream.context.mjs'

/**
* @summary Request handler callback.
*
* @description Request handlers are callbacks responding to a single incoming
* request by inspecting the `request` and using the `response` to stream data as
* appropriate.
*
* A single request may go through multiple request handlers. To enable data
* sharing between request handlers, a `context` object is provided that can be
* freely modified.
*
* Asynchronous handlers are supported - in case a handler returns a Promise, it
* will be awaited before moving on to the next handler.
*
* For example, the first handler may take the `authorization` string from the
* message header, look up the corresponding user from the DB and store the data
* in the `context` object. Then, the next handler can perform operations on the
* user, without needing to know how the user was authenticated.
*
* **NOTE:** If a response is not finished ( either by calling `.finish` or
* `.error` ) even after all the applicable handlers have been called, an error
* will be emitted. Leaving responses unfinished is bad practice.
*
* @callback RequestHandler
* @param {Request} request Request data
* @param {Response} response Response instance
* @param {object} context Context object
* @typedef {function(Request, Response, object)} RequestHandler
*/

/**
* @summary Request exception handler callback.
*
* @description Exception handlers are called in cases when an exception is
* thrown during request processing. Exception handlers act similar to regular
* exception handlers, in the sense that a single request may go through multiple
* exception handlers, and they may stream response data in return.
*
* They also have access to the same data as the regular request handlers, in
* addition to the exception that occurred during processing.
*
* Asynchronous exception handlers are supported. If an exception handler returns
* a promise, it will be awaited before moving on to the next exception handler.
*
* **NOTE:** If a response is not finished ( either by calling `.finish` or
* `.error` ) even after all the applicable handlers have been called, an error
* will be emitted. Leaving responses unfinished is bad practice.
*
* @callback RequestExceptionHandler
* @param {Request} request Request data
* @param {Response} response Response instance
* @param {object} context Context object
* @param {any} exception Exception occurred
* @typedef {function(Request, Response, object, any)} RequestExceptionHandler
*/

/**
* @summary Default request handler.
*
* @description This handler should be registered as a default handler, in cases
* where no handlers are registered for the message subject. The response will
* always be the following:
*
* ```js
* {
*   "header": {
*     // original header
*   },
*
*   "type": "err",
*
*   "error": {
*     "type": "UnknownSubject",
*     "message": "Unknown subject: <subject>"
*   }
* }
* ```
*
* @param {Request} request Request data
* @param {Response} response Response instance
* @param {object} _context Context object
*/
export function unknownSubjectHandler (request, response, _context) {
  response.error(new MessageError({
    type: 'UnknownSubject',
    message: `Unknown subject: ${request.header.subject}`
  }))
}

/**
* @summary Default exception handler.
*
* @description This exception handler is always registered and serves as a
* catch-all exception handler. It will try to extract the exception's name and
* message to be used as error type and message. Otherwise it will fall back to a
* generic 'UnknownError' without message.
*
* @param {Request} _request Request data
* @param {Response} response Response instance
* @param {object} _context Context object
* @param {any} exception Exception occurred
*/
export function defaultExceptionHandler (_request, response, _context, exception) {
  const error = new MessageError({
    type: exception.name || 'UnknownError',
    message: exception.message || 'Unexpected error occurred!'
  })

  response.error(error)
}

/**
* @summary Server class.
*
* @description The server class listens on a set of streams and for any incoming
* message:
* 1. Parses it as JSON
* 1. Validates it as a `Message`
* 1. Calls the appropriate handlers based on its `subject`
*
* In case no handler is registered for the incoming message's subject, the
* default handlers will be called.
*
* In case an exception occurred during processing, the exception handlers will
* be called.
*
* Each of these cases boil down to calling to set of handlers. During this
* process, if the response becomes finished at any point, the loop is broken and
* the message's processing will be finished.
*
* Note that the Server itself is not aware of the type of stream - it can be a
* file, a TCP Socket, a Websocket, or anything else that can function as a
* Duplex. This also means that the Server cannot 'listen' on a socket. Instead,
* any amount of streams can be added with the `connect` method. In case any of
* the streams become inactive, they can be removed with the `disconnect` method.
*
* This setup lends itself to a Server implementation that is not concerned with
* the particulars of the underlying streams, and external factory methods that
* adapt the specific `Duplex` implementations to something the `Server` can
* manage.
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

  /**
  * Construct a server.
  *
  * @param {object} [options] Options
  * @param {pino.Logger} [options.logger] Logger; defaults to a `pino` logger
  */
  constructor (options) {
    super()

    this.#logger = options?.logger ?? pino({ name: 'nlon-server' })

    this.on('error', err =>
      this.#logger.error({ err }, 'Server stream error!'))
  }

  /**
  * @summary Register a request handler.
  *
  * @description To process incoming messages, handlers are selected based on
  * the message's `subject`. A single `subject` may map to multiple handlers -
  * these are called in order of registration.
  *
  * The newly registered handlers are pushed to the end of the list, meaning that
  * the most recently registered handler will be called last.
  *
  * @param {string} subject Subject
  * @param {...RequestHandler} handlers Request handler
  */
  handle (subject, ...handlers) {
    this.#ensureHandler(subject)
    this.#handlers.get(subject).push(...handlers)
  }

  /**
  * @summary Register a request exception handler.
  *
  * @description Exception handlers are called in case an exception is thrown
  * during message processing. Multiple exception handlers may be registered,
  * and will be called from **most recently registered** to **least recently
  * registered.**
  *
  * This reverse order is implemented because a catch-all exception handler is
  * always registered, which must be run last.
  *
  * @param {...RequestExceptionHandler} handlers Exception handlers
  */
  handleException (...handlers) {
    // Prepend the array with the reversed handlers array
    // i.e. guarantee the handlers are in reverse order compared to insertion
    // Rationale: inserts are much rarer than looping
    this.#exceptionHandlers.unshift(...handlers.reverse())
  }

  /**
  * @summary Set default handlers.
  *
  * @description Default handlers are called in case no request handlers are
  * registered to the incoming message's `subject`. The processing works the
  * same as regular request handlers - a set of handlers is ran until there's no
  * more handlers left to call or the response is finished.
  *
  * This method **replaces** the list of default handlers, instead of appending
  * to it.
  *
  * At least one handler must be present.
  *
  * By default, `unknownSubjectHandler` is registered as the default handler.
  *
  * @param {...RequestHandler} handlers Default handlers
  */
  defaultHandlers (...handlers) {
    assert(handlers.length > 0, 'At least one default handler must be present!')

    this.#defaultHandlers = handlers
  }

  /**
  * @summary Configure the server.
  *
  * @description This method expects a method that can be called with the server
  * as the only argument. This makes it possible to register handler similar to
  * how `register` can be used in Fastify to add routes.
  *
  * @example
  *
  *   // userHandlers.mjs
  *   userHandlers (server) {
  *     server.handle('user/login', (req, res, ctx) => { ... })
  *     server.handle('user/logout', (req, res, ctx) => { ... })
  *   }
  *
  *   // index.mjs
  *   import { userHandlers } from 'userHandlers.mjs'
  *
  *   const server = new Server(...)
  *   server.configure(userHandlers)
  *
  * @param {function(Server)} configurer Configuration function
  */
  configure (configurer) {
    configurer(this)
  }

  /**
  * @summary Connect a stream to the server, listening to its incoming messages.
  *
  * @description Internally, the stream will be piped before listening to its
  * 'data' events. Any errors encountered on either the original or the piped
  * stream will result in an `error` event on the Server instance.
  *
  * After every connected stream, a 'connect' event will be emitted with the
  * stream as event data.
  *
  * In case the stream becomes closed, it will be disconnected automatically,
  * emitting a 'disconnect' event.
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
      handler: data => {
        this.#handleMessage(data, streamContext)
          .catch(err => this.emit('error', err))
      }
    })

    this.#logger.debug({ id: streamContext.id, stream }, 'Connecting stream')

    streamContext.pipe.on('data', data => {
      this.#logger.debug({ data }, 'Received data')
      streamContext.handler(data)
    })

    streamContext.stream.on('error', err => this.emit('error',
      new StreamingError(stream, err))
    )
    streamContext.pipe.on('error', err => this.emit('error',
      new StreamingError(stream, err))
    )

    stream.on('close', () => {
      this.#logger.debug({ id: streamContext.id },
        'Stream closed, disconnecting')
      this.disconnect(stream)
    })

    this.#streams.set(stream, streamContext)
    this.emit('connect', stream)
  }

  /**
  * @summary Disconnect the stream, no longer listening to messages coming from
  * it.
  *
  * @description Additionally, a 'disconnect' event is also emitted with the
  * disconnected stream as event data.
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
  * @returns {Promise<void>}
  */
  async #handleMessage (message, streamContext) {
    const logger = this.#logger.child({ stream: streamContext.id })
    logger.debug({ message }, 'Received message')

    // Validate message
    if (!this.#validateMessage(message, streamContext)) {
      logger.error({ message }, 'Received invalid message, ignoring message')

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

    try {
      console.log(`Applying ${handlers.length} handlers on subject ${message.header.subject}`)
      await this.#applyHandlers(handlers, request, response, context)
    } catch (err) {
      if (err instanceof UnfinishedResponseError) {
        // Propagate exception instead of passing to exception handlers
        throw err
      }

      logger.warn({ err }, 'Caught exception processing message')

      console.log(`Applying ${this.#exceptionHandlers.length} exception handlers on subject ${message.header.subject}`)
      await this.#applyHandlers(this.#exceptionHandlers, request, response, context,
        err)
    }
  }

  /**
  * @param {string} subject
  */
  #ensureHandler (subject) {
    if (!this.#handlers.has(subject)) {
      this.#handlers.set(subject, [])
    }
  }

  /**
  * @param {Message} message
  * @param {StreamContext} streamContext
  * @returns {boolean}
  */
  #validateMessage (message, streamContext) {
    try {
      Message.validate(message)
    } catch (err) {
      // Emit error event and bail
      this.emit('error',
        new InvalidMessageError(streamContext.stream, message, err.message)
      )

      return false
    }

    return true
  }

  /**
  * @param {RequestHandler[] | RequestExceptionHandler[]} handlers
  * @param {Request} request
  * @param {Response} response
  * @param {object} context
  * @param {any} [error]
  */
  async #applyHandlers (handlers, request, response, context, error) {
    for (const handler of handlers) {
      await handler(request, response, context, error)

      if (response.isFinished) {
        break
      }
    }

    if (!response.isFinished) {
      throw new UnfinishedResponseError(response)
    }
  }
}
