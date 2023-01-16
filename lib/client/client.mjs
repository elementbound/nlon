import stream from 'stream'
import ndjson from 'ndjson'
import assert from 'node:assert'
import { Message } from '../protocol.mjs'
import { IncomingCorrespondence } from './correspondence.mjs'
import { InvalidMessageError, StreamingError } from '../server/error.mjs'

export class Client extends stream.EventEmitter {
  /** @type {stream.Duplex} */
  #connection

  /** @type {Map<string, IncomingCorrespondence>} */
  #correspondences = new Map()

  constructor (connection, options) {
    super()

    this.#connect(connection)
    // TODO: Use options
  }

  /**
  * Send message
  *
  * @param {Message} message Message
  * @returns {IncomingCorrespondence} Correspondence
  */
  send (message) {
    // TODO: Consider custom serializer
    this.#connection.write(JSON.stringify(message) + '\n', 'utf-8')

    const result = new IncomingCorrespondence(this.#connection, message.header)
    this.#correspondences.set(message.header.correspondenceId, result)

    return result
  }

  /**
  * Get the next out-of-bounds message.
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
    const pipe = stream.pipe(ndjson.parse())
    pipe.on('data', message => this.#handleMessage(message))

    stream.on('close', () => this.emit('close'))
    stream.on('error', err =>
      this.emit('error', new StreamingError(stream, err)))
    pipe.on('error', err =>
      this.emit('error', new StreamingError(stream, err)))
  }

  #handleMessage (message) {
    // TODO: Move to function
    // Validate message
    try {
      assert(message?.header, 'Missing header!')
      assert(message?.header?.correspondenceId?.length > 0,
        'Missing correspondence id!')
      assert(message?.header?.subject?.length > 0, 'Missing subject!')
    } catch (err) {
      // logger.error({ message }, 'Received invalid message, emitting error')

      // Emit error event and bail
      this.emit('error',
        new InvalidMessageError(this.#connection, message, err.message)
      )

      return
    }

    // Handle message
    const correspondenceId = message.header.correspondenceId
    const correspondence = this.#ensureCorrespondence(correspondenceId)
    correspondence.handle(message)
  }

  #ensureCorrespondence (message) {
    const id = message.header.correspondenceId

    if (!this.#correspondences.has(id)) {
      const result = new IncomingCorrespondence(this.#connection, message.header)
      this.emit('correspondence', result)
      this.#correspondences.set(id, result)

      return result
    }

    return this.#correspondences.get(id)
  }
}
