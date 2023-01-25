import stream from 'stream'
import ndjson from 'ndjson'
import pino from 'pino'
import { nanoid } from 'nanoid'
import { Message } from '../protocol.mjs'
import { IncomingCorrespondence } from './correspondence.mjs'
import { InvalidMessageError, StreamingError } from '../server/error.mjs'
import { StreamContext } from '../stream.context.mjs'

/**
* @summary Client class.
*
* @description The client class attaches to a single connection and manages
* correspondences on it. This includes both initiating new correspondences by
* sending a message and reacting to incoming correspondences.
*
* Each incoming message is picked up by the client and associated with a known
* `IncomingCorrespondence` instance, if any exists. If it is an entirely new
* correspondence, it is emitted as a `correspondence` event.
*
* Any and all errors both occurring during processing and coming from the
* underlying stream will be propagated through the `error` event.
*
* Note that the Client itself does not know about the particulars of its
* underlying connection - as long as it can be used as a `stream.Duplex` it will
* function fine. This enables factory methods to create clients on TCP sockets,
* WebSockets, or even adapt other types.
*/
export class Client extends stream.EventEmitter {
  /** @type {StreamContext} */
  #streamContext

  /** @type {Map<string, IncomingCorrespondence>} */
  #correspondences = new Map()

  /** @type {pino.Logger} */
  #logger

  /**
  * Construct a client.
  *
  * @param {stream.Duplex} connection Connection
  * @param {object} [options] Options
  * @param {pino.Logger} [options.logger=pino()] Logger
  * @param {string} [options.id=nanoid()] Client ID, used for logging
  */
  constructor (connection, options) {
    super()

    this.#streamContext = new StreamContext({
      id: options?.id ?? nanoid(),
      stream: connection
    })

    this.#logger = options?.logger ?? pino({ name: `nlon-client-${this.id}` })

    this.on('error', err =>
      this.#logger.error({ err }, 'Client stream error!'))

    this.#connect(connection)
  }

  /**
  * Client ID, used primarily for logging.
  *
  * @type {string}
  */
  get id () {
    return this.#streamContext.id
  }

  /**
  * Whether the Client is connected.
  *
  * @type {boolean}
  */
  get isConnected () {
    return this.#streamContext.stream !== undefined
  }

  /**
  * @summary Disconnect client.
  *
  * @description Afther this call, the client won't listen to any more incoming
  * messages and won't be able to send any traffic.
  *
  * It is considered an error to send anything after the client is disconnected.
  *
  * **Note** that the underlying stream will not be closed.
  */
  disconnect () {
    this.#logger.debug('Disconnecting stream!')
    const { pipe, stream, handler } = this.#streamContext

    pipe.off('data', handler)
    this.#streamContext.clear()

    // Emit disconnect, same as with Server
    this.emit('disconnect', stream)
  }

  /**
  * @summary Initiate a new correspondence by sending a message.
  *
  * @description The message is validated before sending and its corresponednce
  * ID will be associated with the returned instance. Any incoming replies will
  * be passed to the correspondence for processing.
  *
  * Using this method to send multiple messages on the same correspondence is
  * discouraged, as it will lead to pointlessly creating multiple correspondence
  * instances for the same correspondence.
  *
  * Trying to send messages after calling `disconnect` is considered an error.
  *
  * @param {Message} message Message
  * @returns {IncomingCorrespondence} Correspondence
  * @throws On invalid messages
  * @throws If disconnected
  */
  send (message) {
    this.#requireConnected('Can\'t send on already disconnected client!')
    Message.validate(message)

    this.#logger.debug({ message }, 'Sending message')
    const { stream } = this.#streamContext

    // TODO: Consider custom serializer
    stream.write(JSON.stringify(message) + '\n', 'utf-8')

    const result = new IncomingCorrespondence(stream, message.header)
    this.#correspondences.set(message.header.correspondenceId, result)

    return result
  }

  /**
  * Get the next new correspondence.
  *
  * @returns {Promise<IncomingCorrespondence>}
  * @throws If disconnected
  */
  receive () {
    this.#requireConnected('Can\'t receive on already disconnected client!')

    return new Promise((resolve, reject) => {
      this.once('correspondence', resolve)
        .once('error', reject)
    })
  }

  /**
  * @param {stream.Duplex} stream
  */
  #connect (stream) {
    const handler = message => {
      try {
        this.#handleMessage(message)
      } catch (err) {
        this.emit('error', err)
      }
    }

    const pipe = stream.pipe(ndjson.parse())
    pipe.on('data', handler)

    // TODO: Disconnect instead of emit close
    stream.on('close', () => this.emit('close'))

    stream.on('error', err =>
      this.emit('error', new StreamingError(stream, err)))
    pipe.on('error', err =>
      this.emit('error', new StreamingError(stream, err)))

    this.#streamContext.handler = handler
    this.#streamContext.stream = stream
    this.#streamContext.pipe = pipe

    // TODO: Emit 'connect'
  }

  /**
  * @param {Message} message
  */
  #handleMessage (message) {
    // Validate message
    try {
      Message.validate(message)
    } catch (err) {
      this.#logger.error({ message }, 'Received invalid message, emitting error')

      // Emit error event and bail
      this.emit('error',
        new InvalidMessageError(this.#streamContext.stream, message, err.message)
      )

      return
    }

    // Handle message
    const correspondence = this.#ensureCorrespondence(message)
    correspondence.handle(message)
  }

  /**
  * @param {Message} message
  */
  #ensureCorrespondence (message) {
    const id = message.header.correspondenceId

    if (!this.#correspondences.has(id)) {
      this.#logger.debug({ id }, 'Found new correspondence!')

      const result =
        new IncomingCorrespondence(this.#streamContext.stream, message.header)
      this.emit('correspondence', result)
      this.#correspondences.set(id, result)

      return result
    }

    return this.#correspondences.get(id)
  }

  #requireConnected (message) {
    if (!this.isConnected) {
      // TODO: Custom error
      throw new Error(message ?? 'Client already disconnected!')
    }
  }
}

/**
* Event emitted upon successful connection by the client.
*
* In practice this means that after this point the client can send and receive
* messages. This may or may not correspond to a background operation, depending
* on the nature of the connection.
*
* The stream itself is emitted upon which the client will transfer messages.
*
* @event Client#connect
* @type {stream.Duplex}
*/

/**
* Event emitted when the client disconnects.
*
* This might happen after a {@link Client#disconnect} call, or when the client's
* underlying stream is closed for whatever reason.
*
* Consistently with the Server events, the stream is emitted as event data.
*
* @event Client#disconnect
* @type {stream.Duplex}
*/

/**
* Event emitted when the client receives a new correspondence.
*
* This happens whenever the client receives a message with a correspondence ID
* that does not belong to an already existing {@link IncomingCorrespondence}, in
* which case a new instance is created and emitted as event data.
*
* @event Client#correspondence
* @type {IncomingCorrespondence}
*/

/**
* Event emitted when the client encounters an error.
*
* This error may either come from the underlying stream itself or from the
* client's own message processing logic.
*
* @event Client#error
* @type {Error}
*/
