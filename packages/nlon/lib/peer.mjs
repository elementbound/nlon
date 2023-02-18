import stream from 'node:stream'
import events from 'node:events'
import ndjson from 'ndjson'
import pino from 'pino'
import { nanoid } from 'nanoid'
import { Message, MessageTypes } from './protocol.mjs'
import { PeerDisconnectedError, InvalidMessageError, StreamingError } from './error.mjs'
import { Correspondence } from './correspondence/correspondence.mjs'

/**
* @typedef {object} PeerOptions
* @property {pino.Logger} [logger=pino()] Logger
* @property {string} [logLevel='info'] Logging level
* @property {string} [id=nanoid()] Peer ID, used for logging
*/

/**
* @summary Peer class.
*
* @description The peer class attaches to a single connection and manages
* correspondences on it. This includes both initiating new correspondences by
* sending a message and reacting to incoming correspondences.
*
* Each incoming message is picked up by the peer and associated with a known
* {@link Correspondence} instance, if any exists. If it is an entirely new
* correspondence, it is emitted as a `correspondence` event.
*
* Any and all errors both occurring during processing and coming from the
* underlying stream will be propagated through the `error` event.
*
* Note that the Peer itself does not know about the particulars of its
* underlying connection - as long as it can be used as a `stream.Duplex` it will
* function fine. This enables factory methods to create peers on TCP sockets,
* WebSockets, or even adapt other types.
*/
export class Peer extends events.EventEmitter {
  /** @type {Map<string, Correspondence>} */
  #correspondences = new Map()

  /** @type {string} */
  #id

  /** @type {stream.Duplex} */
  #stream

  /** @type {stream.Duplex} */
  #pipe

  /** @type {Function} */
  #handler

  /** @type {pino.Logger} */
  #logger

  /**
  * Construct a peer.
  *
  * @param {stream.Duplex} connection Connection
  * @param {PeerOptions} [options] Options
  */
  constructor (connection, options) {
    super()

    this.#id = options?.id ?? nanoid()
    this.#stream = connection

    this.#logger = options?.logger ??
      pino({ name: `nlon-peer-${this.id}`, level: options?.logLevel ?? 'info' })

    this.on('error', err =>
      this.#logger.error({ err }, 'Peer stream error!'))

    this.#connect(connection)
  }

  /**
  * Peer ID, used primarily for logging.
  *
  * @type {string}
  */
  get id () {
    return this.#id
  }

  /**
  * Whether the Peer is connected.
  *
  * @type {boolean}
  */
  get isConnected () {
    return this.#stream !== undefined
  }

  /**
  * @summary Disconnect peer.
  *
  * @description Afther this call, the peer won't listen to any more incoming
  * messages and won't be able to send any traffic.
  *
  * It is considered an error to send anything after the peer is disconnected.
  *
  * **Note** that the underlying stream will not be closed.
  */
  disconnect () {
    this.#logger.debug('Disconnecting stream!')

    this.#pipe.off('data', this.#handler)

    // Emit disconnect, same as with Server
    this.emit('disconnect', this.#stream)

    this.#stream = undefined
    this.#pipe = undefined
    this.#handler = undefined
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
  * @param {Message} message Message
  * @returns {Correspondence} Correspondence
  * @throws {PeerDisconnectedError} If disconnected
  * @throws On invalid messages
  */
  send (message) {
    this.#requireConnected('Can\'t send on already disconnected peer!')
    message.type ??= MessageTypes.Data
    Message.validate(message)

    this.#logger.debug({ message }, 'Sending message')

    const stream = this.#stream
    stream.write(JSON.stringify(message) + '\n', 'utf-8')

    const result = new Correspondence({ header: message.header, stream })
    this.#correspondences.set(message.header.correspondenceId, result)

    return result
  }

  /**
  * Get the next new correspondence.
  *
  * @returns {Promise<Correspondence>}
  * @throws {PeerDisconnectedError} If disconnected
  */
  receive () {
    this.#requireConnected('Can\'t receive on already disconnected peer!')

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

    stream.on('close', () => this.disconnect())

    stream.on('error', err =>
      this.emit('error', new StreamingError(stream, err)))
    pipe.on('error', err =>
      this.emit('error', new StreamingError(stream, err)))

    this.#handler = handler
    this.#stream = stream
    this.#pipe = pipe

    this.emit('connect', stream)
  }

  /**
  * @param {Message} message
  */
  #handleMessage (message) {
    // Validate message
    try {
      Message.validate(message)
    } catch (err) {
      this.#logger.error({ err, message },
        'Received invalid message, emitting error')

      // Emit error event and bail
      this.emit('error',
        new InvalidMessageError(this.#stream, message, err.message)
      )

      return
    }

    // Handle message
    this.#logger.debug({ message }, 'Received message')
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

      const result = new Correspondence({
        header: message.header,
        stream: this.#stream
      })

      this.emit('correspondence', result)
      this.#correspondences.set(id, result)

      return result
    }

    return this.#correspondences.get(id)
  }

  #requireConnected (message) {
    if (!this.isConnected) {
      throw new PeerDisconnectedError(
        message ?? 'Peer already disconnected!')
    }
  }
}

/**
* Event emitted upon successful connection by the peer.
*
* In practice this means that after this point the peer can send and receive
* messages. This may or may not correspond to a background operation, depending
* on the nature of the connection.
*
* The stream itself is emitted upon which the peer will transfer messages.
*
* @event Peer#connect
* @type {stream.Duplex}
*/

/**
* Event emitted when the peer disconnects.
*
* This might happen after a {@link Peer#disconnect} call, or when the peer's
* underlying stream is closed for whatever reason.
*
* Consistently with the Server events, the stream is emitted as event data.
*
* @event Peer#disconnect
* @type {stream.Duplex}
*/

/**
* Event emitted when the peer receives a new correspondence.
*
* This happens whenever the peer receives a message with a correspondence ID
* that does not belong to an already existing {@link IncomingCorrespondence}, in
* which case a new instance is created and emitted as event data.
*
* @event Peer#correspondence
* @type {IncomingCorrespondence}
*/

/**
* Event emitted when the peer encounters an error.
*
* This error may either come from the underlying stream itself or from the
* peer's own message processing logic.
*
* @event Peer#error
* @type {Error}
*/
