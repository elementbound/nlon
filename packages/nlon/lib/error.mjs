/* eslint-disable no-unused-vars */
import stream from 'node:stream'
import { MessageError } from './protocol.mjs'
import { Correspondence } from './correspondence/correspondence.mjs'
import { Peer } from './peer.mjs'
/* eslint-enable no-unused-vars */

import assert from 'node:assert'

/**
* @summary Error representing an invalid message.
*
* @description Invalid messages are JSON strings that can be parsed as such,
* but do not conform to NLON's protocol, for example missing header,
* correspondenceId or subject.
*/
export class InvalidMessageError extends Error {
  #stream
  #content

  /**
  * Construct an error.
  *
  * @param {stream.Duplex} stream Stream the invalid message was received on
  * @param {object} content Parsed JSON content
  * @param {string} message Error message
  */
  constructor (stream, content, message) {
    super(message)

    this.#stream = stream
    this.#content = content
  }

  /**
  * Stream the invalid message was received on
  * @type {stream.Duplex}
  */
  get stream () {
    return this.#stream
  }

  /**
  * Parsed JSON content
  * @type {object}
  */
  get content () {
    return this.#content
  }
}

/**
* @summary Error representing any kind of stream error.
*
* @description Stream errors are thrown when the incoming message cannot be
* parsed as JSON, or in case any other error is emitted by the stream.
*/
export class StreamingError extends Error {
  #stream
  #cause

  /**
  * Construct an error.
  *
  * @param {stream.Duplex} stream Stream the error was received on
  * @param {any} cause Error emitted by the stream
  */
  constructor (stream, cause) {
    super(cause.message)

    this.#stream = stream
    this.#cause = cause
  }

  /**
  * Stream the error was received on
  * @type {stream.Duplex}
  */
  get stream () {
    return this.#stream
  }

  /**
  * Error emitted by the stream
  * @type {any}
  */
  get cause () {
    return this.#cause
  }
}

/**
* Error thrown when an error message is received over a correspondence.
*/
export class CorrespondenceError extends Error {
  /**
  * A short string indicating the error type.
  *
  * @type {string}
  */
  type

  /**
  * Construct an error.
  *
  * @param {MessageError} error
  */
  constructor (error) {
    assert(error.type, 'Missing error type!')
    assert(error.message, 'Missing error message!')

    super(error.message)
    this.type = error.type
  }
}

/**
* @summary Error thrown when the correspondence handler doesn't finish the
* correspondence.
*/
export class UnfinishedCorrespondenceError extends Error {
  #correspondence

  /**
  * Construct an error.
  *
  * @param {Correspondence} correspondence Unfinished correspondence
  */
  constructor (correspondence) {
    super('Correspondence was not finished!')

    this.#correspondence = correspondence
  }

  /**
  * The correspondence left unfinished
  * @type {Correspondence}
  */
  get correspondence () {
    return this.#correspondence
  }
}

/**
* Error thrown when attempting to write to an unwritable correspondence.
*/
export class UnwritableCorrespondenceError extends Error {
  #correspondence

  /**
  * Construct an error.
  *
  * @param {Correspondence} correspondence Correspondence
  */
  constructor (correspondence) {
    super('Correspondence is not writable!')

    this.#correspondence = correspondence
  }

  /**
  * Correspondence
  * @type {Correspondence}
  */
  get correspondence () {
    return this.#correspondence
  }
}

/**
* Error thrown when attempting to read from an unreadable correspondence.
*/
export class UnreadableCorrespondenceError extends Error {
  #correspondence

  /**
  * Construct an error.
  *
  * @param {Correspondence} correspondence Correspondence
  */
  constructor (correspondence) {
    super('Correspondence is not readable!')

    this.#correspondence = correspondence
  }

  /**
  * Correspondence
  * @type {Correspondence}
  */
  get correspondence () {
    return this.#correspondence
  }
}

/**
* Error emitted when any of the Server's managed peers encounter an error.
*/
export class PeerError extends Error {
  /** @type {Peer} */
  #peer

  /**
  * Construct error.
  *
  * @param {Peer} peer Peer encountering error
  * @param {Error} cause Encountered error
  * @param {string} [message] Error message
  */
  constructor (peer, cause, message) {
    super(message ?? 'Received error from peer', { cause })

    this.#peer = peer
  }

  /**
  * Peer that encountered the error.
  * @type {Peer}
  */
  get peer () {
    return this.#peer
  }
}

/**
Error thrown when trying to send / receive on a peer that's already
* disconnected.
*/
export class PeerDisconnectedError extends Error {}
