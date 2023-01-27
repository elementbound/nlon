/* eslint-disable no-unused-vars */
import stream from 'node:stream'
import { Response } from './server/response.mjs'
import { MessageError } from './protocol.mjs'
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
* @summary Error thrown when writing to a finished response.
* @see Response
*/
export class FinishedResponseError extends Error {
  #response

  /**
  * Construct an error.
  *
  * @param {Response} response Finished response
  */
  constructor (response) {
    super('Response is already finished!')

    this.#response = response
  }

  /**
  * The response under a write attempt
  * @type {Response}
  */
  get response () {
    return this.#response
  }
}

/**
* @summary Error thrown when none of the applicable handlers finish the
* response.
*/
export class UnfinishedResponseError extends Error {
  #response

  /**
  * Construct an error.
  *
  * @param {Response} response Unfinished response
  */
  constructor (response) {
    super('Response was not finished!')

    this.#response = response
  }

  /**
  * The response left unfinished
  * @type {Response}
  */
  get response () {
    return this.#response
  }
}

/**
* Error thrown when trying to send / receive on a client that's already
* disconnected.
*/
export class ClientDisconnectedError extends Error {}
