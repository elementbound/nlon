/* eslint-disable no-unused-vars */
import stream from 'node:stream'
import { Message, Error } from '../protocol.mjs'
/* eslint-enable no-unused-vars */

import assert from 'assert'
import ndjson from 'ndjson'
import { Request } from './request.mjs'
import { Response } from './response.mjs'

/**
* @typedef {function(Request, Response, object)} RequestHandler
* @callback RequestHandler
* @param {Request} request
* @param {Response} response
* @param {object} context
*/

/**
* Default handler returning an error
*
* @param {Request} request
* @param {Response} response
* @param {object} _context
*/
export function unknownSubjectHandler (request, response, _context) {
  response.error(new Error({
    type: 'UnknownSubject',
    message: `Unknown subject: ${request.header.subject}`
  }))
}

class StreamContext {
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
export class Server {
  /** @type {Map<string, RequestHandler[]>} */
  #handlers = new Map()

  /** @type {RequestHandler[]} */
  #defaultHandlers = [
    unknownSubjectHandler
  ]

  /** @type {Map<stream.Duplex, StreamContext>} */
  #streams = new Map()

  #handleCallback = this.#handleMessage.bind(this)

  /**
  * Register a request handler.
  *
  * @param {string} subject Subject
  * @param {RequestHandler} handler Request handler
  */
  handle (subject, handler) {
    this.#ensureHandler(subject)
    this.#handlers.get(subject).push(handler)
  }

  defaultHandlers (...handlers) {
    assert(handlers.length > 0, 'At least one default handler must be present!')

    this.#defaultHandlers = handlers
  }

  /**
  * Configure the server.
  *
  * @param {function(Server)} callback Configuration function
  */
  configure (callback) {
    callback(this)
  }

  /**
  * Connect a stream to the server, listening to its incoming messages.
  *
  * @param {stream.Duplex} stream Stream
  */
  connect (stream) {
    if (this.#streams.has(stream)) { return }

    const streamContext = new StreamContext({
      stream,
      pipe: stream.pipe(ndjson.parse()),
      handler: data => this.#handleMessage(data, streamContext)
    })

    streamContext.pipe.on('data', streamContext.handler)

    this.#streams.set(stream, streamContext)
  }

  /**
  * Disconnect the stream, no longer listening to messages coming from it.
  *
  * @param {stream.Duplex} stream Stream
  */
  disconnect (stream) {
    const streamContext = this.#streams.get(stream)

    if (!streamContext) { return }

    streamContext.pipe.off('data', streamContext.handler)
    this.#streams.delete(stream)
  }

  /**
  * @param {Message} message
  * @param {StreamContext} streamContext
  */
  #handleMessage (message, streamContext) {
    console.log('Received message', message)

    // Validate message
    assert(message?.header, 'Missing header!')
    assert(message?.header?.correspondenceId?.length > 0, 'Missing correspondence id!')
    assert(message?.header?.subject?.length > 0, 'Missing subject!')

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
    const handlers = this.#handlers.get(message.header.subject) ?? this.#defaultHandlers

    for (const handler of handlers) {
      handler(request, response, context)

      if (response.isFinished) {
        break
      }
    }
  }

  #ensureHandler (subject) {
    if (!this.#handlers.has(subject)) { this.#handlers.set(subject, []) }
  }
}
