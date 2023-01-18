import stream from 'stream'
import ndjson from 'ndjson'
import pino from 'pino'
import { nanoid } from 'nanoid'
import { Message } from '../protocol.mjs'
import { IncomingCorrespondence } from './correspondence.mjs'
import { InvalidMessageError, StreamingError } from '../server/error.mjs'
import { StreamContext } from '../stream.context.mjs'

/**
* Client class
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

  get id () {
    return this.#streamContext.id
  }

  disconnect () {
    this.#logger.debug('Disconnecting stream!')
    const { pipe, stream, handler } = this.#streamContext

    pipe.off('data', handler)
    this.emit('disconnect', stream)
  }

  /**
  * Send message
  *
  * @param {Message} message Message
  * @returns {IncomingCorrespondence} Correspondence
  * @throws On invalid messages
  */
  send (message) {
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
  */
  receive () {
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

    stream.on('close', () => this.emit('close'))
    stream.on('error', err =>
      this.emit('error', new StreamingError(stream, err)))
    pipe.on('error', err =>
      this.emit('error', new StreamingError(stream, err)))

    this.#streamContext.handler = handler
    this.#streamContext.stream = stream
    this.#streamContext.pipe = pipe
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
}
