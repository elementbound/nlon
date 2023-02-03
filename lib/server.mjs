/* eslint-disable no-unused-vars */
import stream from 'node:stream'
import { Message, MessageError } from './protocol.mjs'
/* eslint-enable no-unused-vars */

import ndjson from 'ndjson'
import pino from 'pino'
import { CorrespondenceError, InvalidMessageError, StreamingError } from './error.mjs'
import { StreamContext } from './stream.context.mjs'
import { Correspondence } from './correspondence/correspondence.mjs'

/**
* @summary Correspondence handler.
*
* @callback CorrespondenceHandler
* @param {Correspondence} correspondence
* @typedef {function(Correspondence)} CorrespondenceHandler
*/

/**
* @summary Correspondence exception handler callback.
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
* @callback CorrespondenceExceptionHandler
* @param {Correspondence} correspondence Correspondence being processed
* @param {any} exception Exception occurred
* @typedef {function(Correspondence, any)} RequestExceptionHandler
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
* @param {Correspondence} correspondence
*/
export function unknownSubjectHandler (correspondence) {
  correspondence.error(new MessageError({
    type: 'UnknownSubject',
    message: `Unknown subject: ${correspondence.header.subject}`
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
* @param {Correspondence} correspondence Correspondence
* @param {any} exception Exception occurred
*/
export function defaultExceptionHandler (correspondence, exception) {
  const error = new MessageError({
    type: exception.name || 'UnknownError',
    message: exception.message || 'Unexpected error occurred!'
  })

  correspondence.error(error)
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
  /** @type {Map<string, CorrespondenceHandler>} */
  #handlers = new Map()

  /** @type {CorrespondenceExceptionHandler[]} */
  #exceptionHandlers = [
    defaultExceptionHandler
  ]

  /** @type {CorrespondenceHandler} */
  #defaultHandler = unknownSubjectHandler

  /** @type {Map<stream.Duplex, StreamContext>} */
  #streams = new Map()

  /** @type {Map<string, Correspondence>} */
  #correspondences = new Map()

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
  * @summary Register a correspondence handler.
  *
  * @description To process incoming messages, handlers are selected based on
  * the message's `subject`. A single `subject` may map to multiple handlers -
  * these are called in order of registration.
  *
  * The newly registered handlers are pushed to the end of the list, meaning that
  * the most recently registered handler will be called last.
  *
  * @param {string} subject Subject
  * @param {CorrespondenceHandler} handler Correspondence handler
  */
  handle (subject, handler) {
    if (this.#handlers.has(subject)) {
      this.#logger.warn({ subject }, 'Subject already has a handler, replacing')
    }

    this.#handlers.set(subject, handler)
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
  * @param {...CorrespondenceExceptionHandler} handlers Exception handlers
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
  * @param {CorrespondenceHandler} handler Default handler
  */
  defaultHandler (handler) {
    this.#defaultHandler = handler
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

    streamContext.pipe.on('data', streamContext.handler)
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

    // Prepare correspondenceId
    const { stream } = streamContext
    const { correspondence, isNew } = this.#ensureCorrespondence(message, stream)

    if (isNew) {
      // Call handler
      const handler =
        this.#handlers.get(message.header.subject) ?? this.#defaultHandler

      handler === this.#defaultHandler &&
        logger.warn({ subject: message.header.subject },
          'Message subject unknown, calling default handler')

      // Intentionally not waiting for this promise to finish
      // Control needs to move to the next line to pass message to
      // correspondence, which will in turn feed the handler with data
      this.#applyHandler(correspondence, handler, logger)
    }

    // Pass message to correspondence
    correspondence.handle(message)
  }

  /**
  * @param {Message} message
  * @param {stream.Duplex} stream
  */
  #ensureCorrespondence (message, stream) {
    const header = message.header
    let isNew = false
    if (!this.#correspondences.has(header.correspondenceId)) {
      const result = new Correspondence({ header, stream })
      this.#correspondences.set(header.correspondenceId, result)
      isNew = true
    }

    return {
      correspondence: this.#correspondences.get(header.correspondenceId),
      isNew
    }
  }

  /**
  * @param {Correspondence} correspondence
  * @param {CorrespondenceHandler} handler
  * @param {pino} logger
  */
  async #applyHandler (correspondence, handler, logger) {
    try {
      await handler(correspondence)
    } catch (err) {
      logger.warn({ err }, 'Caught exception processing message')
      this.#handleException(correspondence, err, logger)
    } finally {
      if (correspondence.writable) {
        // TODO: Custom error type
        this.emit('error', new Error('Correspondence not finished!'))
      }

      // TODO: Make sure we don't emit new correspondences with the same id
      // This can happen if a faulty peer responds after closing the
      // correspondence. Then again, do we want to handle that?
      this.#correspondences.delete(correspondence.header.correspondenceId)
    }
  }

  /**
  * @param {Correspondence} correspondence
  * @param {any} error
  */
  async #handleException (correspondence, error, logger) {
    try {
      for (const exceptionHandler of this.#exceptionHandlers) {
        if (!correspondence.writable) {
          break
        }

        await exceptionHandler(CorrespondenceError, error)
      }
    } catch (err) {
      const correspondenceId = correspondence.header.correspondenceId
      logger.error({ err, correspondenceId },
        'Caught exception processing exception')

      correspondence.error(new MessageError({
        type: 'GenericError',
        message: 'Failed processing correspondence'
      }))
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
}
