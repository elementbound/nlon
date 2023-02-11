/* eslint-disable no-unused-vars */
import stream from 'node:stream'
import { MessageError } from './protocol.mjs'
import { Correspondence } from './correspondence/correspondence.mjs'
/* eslint-enable no-unused-vars */

import { nanoid } from 'nanoid'
import pino from 'pino'
import { WritableCorrespondence } from './correspondence/writable.correspondence.mjs'
import { UnfinishedCorrespondenceError } from './error.mjs'
import { Peer } from './peer.mjs'

/**
* @private
* @typedef {object} PeerContext
* @property {Peer} peer
* @property {object} handlers
*/

/**
* @summary Correspondence handler.
*
* @description Correspondence handlers are responsible for processing any new
* incoming correspondences. They are given access to the correspondence
* instance, which can then be used to iterate over the incoming data and send
* back any replies as necessary.
*
* Async correspondence handlers are supported.
*
* Any exception thrown during a correspondence handler's run will be caught and
* passed to the {@link CorrespondenceExceptionHandler|exception handlers}.
*
* @callback CorrespondenceHandler
* @param {Peer} peer Peer on the other end of the correspondence
* @param {Correspondence} correspondence Received correspondence
* @typedef {function(Correspondence)} CorrespondenceHandler
*
* @see {@link Correspondence}
*/

/**
* @summary Correspondence exception handler callback.
*
* @description Exception handlers are called in cases when an exception is
* thrown during correspondence processing. When encountering an exception, all
* of the registered exception handlers are called, meaning that an exception
* might go through multiple exception handlers.
*
* In turn, each exception handler may decide if they are applicable to the given
* correspondence ( e.g. based on subject ) and error, and if so, send a response
* on the correspondence.
*
* If the correspondence is finished by any of the exception handlers, the rest
* of them will not be invoked.
*
* Asynchronous exception handlers are supported. If an exception handler returns
* a promise, it will be awaited before moving on to the next exception handler.
*
* **NOTE:** If a correpsondence is not finished ( either by calling `.finish` or
* `.error` ) even after all the applicable handlers have been called, an error
* will be emitted. Leaving correspondences unfinished is bad practice.
*
* @callback CorrespondenceExceptionHandler
* @param {Peer} peer Peer on the other end of the correspondence
* @param {WritableCorrespondence} correspondence Correspondence being processed
* @param {any} exception Exception occurred
* @typedef {function(WritableCorrespondence, any)} CorrespondenceExceptionHandler
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
* @param {Peer} _peer Peer
* @param {Correspondence} correspondence Correspondence
*/
export function unknownSubjectHandler (_peer, correspondence) {
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
* @param {Peer} _peer Peer
* @param {Correspondence} correspondence Correspondence
* @param {any} exception Exception occurred
*/
export function defaultExceptionHandler (_peer, correspondence, exception) {
  const error = new MessageError({
    type: exception.name || 'UnknownError',
    message: exception.message || 'Unexpected error occurred!'
  })

  correspondence.error(error)
}

/**
* @typedef {object} ServerOptions
* @property {pino.Logger} [logger=pino()] Logger
* @property {string} [logLevel='info'] Log level
*/

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
* default handler will be called.
*
* In case an exception occurred during processing, the exception handlers will
* be called. During this process, if the correspondence becomes finished at any
* point, the loop is broken and the message's processing will be finished.
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

  /** @type {Map<stream.Duplex, PeerContext>} */
  #peers = new Map()

  /** @type {pino.Logger} */
  #logger

  /**
  * Construct a server.
  *
  * @param {ServerOptions} [options] Options
  */
  constructor (options) {
    super()

    this.#logger = options?.logger ??
      pino({ name: 'nlon-server', level: options?.logLevel ?? 'info' })

    this.on('error', err =>
      this.#logger.error({ err }, 'Server stream error!'))
  }

  /**
  * @summary Register a correspondence handler.
  *
  * @description To process incoming messages, handlers are selected based on
  * the message's `subject`.
  *
  * If the given subject already has a handler, a warning message will be
  * logged.
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
  * @summary Set default handler.
  *
  * @description The default handler is called in case no request handler is
  * registered for the incoming message's `subject`.
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
  * as the only argument. This makes it possible to export "bundles" of handlers
  * without depending on the actual server instance.
  *
  * @example
  *
  *   // userHandlers.mjs
  *   userHandlers (server) {
  *     server.handle('user/login', (correspondence, ctx) => { ... })
  *     server.handle('user/logout', (correspondence, ctx) => { ... })
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
    const id = nanoid()
    const peer = new Peer(stream, {
      id,
      logger: this.#logger.child({ peer: id })
    })
    this.#logger.debug({ id, stream }, 'Connecting stream')

    // Subscribe to events
    const handlers = {
      disconnect: () => this.#handleDisconnect(stream, peer),
      correspondence: correspondence =>
        this.#handleCorrespondence(peer, correspondence),
      // TODO: Consider wrapping in PeerError or something
      error: err => this.emit('error', err)
    }

    Object.entries(handlers)
      .forEach(([event, handler]) => peer.on(event, handler))

    /** @type {PeerContext} */
    const peerContext = {
      peer, handlers
    }

    this.#peers.set(stream, peerContext)
    this.emit('connect', stream, peer)
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
    const peerContext = this.#peers.get(stream)
    if (!peerContext) { return }

    // This will make the Peer emit a disconnect event, which will in turn
    // trigger #handleDisconnect
    peerContext.peer.disconnect()
  }

  /**
  * @summary Get all peers connected to this server.
  *
  * @description > This always return a new copy.
  *
  * @type {Peer[]}
  */
  get peers () {
    return [...this.#peers.values()].map(pc => pc.peer)
  }

  /**
  * @param {stream.Duplex} stream
  * @param {Peer} peer
  */
  #handleDisconnect (stream, peer) {
    this.#logger.debug({ id: peer.id, stream }, 'Disconnecting stream')

    const peerContext = this.#peers.get(stream)
    const handlers = peerContext?.handlers

    if (!handlers) {
      this.#logger.error(
        { id: peer.id, stream },
        'Handlers missing for peer on disconnect! Please report a bug.'
      )

      return
    }

    // Unsubscribe and remove peer
    Object.entries(handlers)
      .forEach(([event, handler]) => peer.off(event, handler))
    this.#peers.delete(stream)

    this.emit('disconnect', stream, peer)
  }

  /**
  * @param {Peer} peer
  * @param {Correspondence} correspondence
  */
  #handleCorrespondence (peer, correspondence) {
    // Correspondence header already populated by Peer
    const header = correspondence.header
    const logger = this.#logger.child({
      correspondence: header.correspondenceId,
      peer: peer.id
    })

    // Find handler
    const handler =
      this.#handlers.get(header.subject) ?? this.#defaultHandler

    handler === this.#defaultHandler &&
      logger.warn({ subject: header.subject },
        'Message subject unknown, calling default handler')

    this.#applyHandler(peer, correspondence, handler, logger)
  }

  /**
  * @param {Peer} peer
  * @param {Correspondence} correspondence
  * @param {CorrespondenceHandler} handler
  * @param {pino} logger
  */
  async #applyHandler (peer, correspondence, handler, logger) {
    try {
      await handler(peer, correspondence)
    } catch (err) {
      logger.warn({ err }, 'Caught exception processing message')
      this.#handleException(peer, correspondence, err, logger)
    } finally {
      if (correspondence.writable) {
        this.emit('error', new UnfinishedCorrespondenceError(correspondence))
      }
    }
  }

  /**
  * @param {Peer} peer
  * @param {Correspondence} correspondence
  * @param {any} error
  * @param {pino} logger
  */
  async #handleException (peer, correspondence, error, logger) {
    try {
      const writable = WritableCorrespondence.wrap(correspondence)
      for (const exceptionHandler of this.#exceptionHandlers) {
        if (!correspondence.writable) {
          break
        }

        await exceptionHandler(peer, writable, error)
      }
    } catch (err) {
      const correspondenceId = correspondence.header.correspondenceId
      logger.error({ err, correspondenceId, peer: peer.id },
        'Caught exception processing exception')

      correspondence.error(new MessageError({
        type: 'GenericError',
        message: 'Failed processing correspondence'
      }))
    }
  }
}

// TODO: Document events
