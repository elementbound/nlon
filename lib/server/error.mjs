/* eslint-disable no-unused-vars */
import stream from 'node:stream'
import { Response } from './response.mjs'
/* eslint-enable no-unused-vars */

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
    return this.#cause
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
}
