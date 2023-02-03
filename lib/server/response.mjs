import assert, { fail } from 'node:assert'

/* eslint-disable no-unused-vars */
import stream from 'node:stream'
import { FinishedResponseError } from '../error.mjs'
import { MessageHeader, Message, MessageTypes, MessageError } from '../protocol.mjs'
/* eslint-enable no-unused-vars */

/**
* @summary Response as managed by the server.
*
* @description The Response class contains all the necessary tools to stream
* messages in response to an incoming request. Response instances are handed to
* the request handlers by the server.
*
* A response can either:
* - Send multiple pieces of data with `write` and then `finish`
* - Send no data and `finish`
* - Send an error by calling `error`
*
* Also note that a `finish` message may or may not contain a response body.
* Adding data to a `finish` call can be useful in cases where all the response
* data is on hand and doesn't need to be sent in multiple roundtrips.
*
* Once a response is finished, the server will not call any more handlers, and
* sending any data ( either through `write`, `finish` or `error` ) is considered
* an error.
*
* If the response is finished an error, any and all previously received response
* data must be discarded by the recipient. It is good practice to send any error
* messages in advance if possible, instead of streaming data before responding
* with an error.
*
* @deprecated
*/
export class Response {
  /** @type {stream.Duplex} */
  #stream

  #isFinished = false

  /**
  * @summary Header of the message being responded to.
  *
  * @description This header will be used for all response messages. This is
  * to ensure that the same `correspondenceId` is used, so that the recipient can
  * match up the responses to the initial message.
  *
  * @type {MessageHeader}
  */
  header = new MessageHeader()

  /**
  * Construct a response.
  *
  * @param {object} options Options
  * @param {MessageHeader} options.header Response header
  * @param {stream.Duplex} options.stream Stream
  */
  constructor (options) {
    this.#stream = options?.stream ?? fail('Stream must be specified for response!')
    options.header && (this.header = options.header)
  }

  /**
  * @summary Check whether the response is finished.
  *
  * @description A response is considered finished once either `finish` or
  * `error` is called. Once either of those is done, sending any data is
  * considered an error.
  *
  * In addition, after the response is finished, the server will stop calling
  * any more handlers.
  */
  get isFinished () {
    return this.#isFinished
  }

  /**
  * @summary Write response data.
  *
  * @description This method will send a `Message` with type `data`. This method
  * can be called 0 or more times. Each call will send a separate message, making
  * it suitable for streaming response data, instead of trying to send all the
  * data in response.
  *
  * Calling this on a finished response is considered an error.
  *
  * @param {any} data Response data
  */
  write (data) {
    this.#ensureWritable()

    const message = new Message({
      type: MessageTypes.Data,
      header: this.header,
      body: data
    })

    this.#write(message)
  }

  /**
  * @summary Finish response.
  *
  * @description This method will send a `Message` with type `fin`, signifying
  * to the recipient to no longer expect any data on this correspondence. A
  * response body may or may not be present in this message. If present, it will
  * be considered as part of the response data.
  *
  * After this call, the response will be considered as finished.
  *
  * Calling this on a finished response is considered an error.
  *
  * @param {any} [data] Response data
  */
  finish (data) {
    this.#ensureWritable()

    const message = new Message({
      type: MessageTypes.Finish,
      header: this.header
    })

    if (data) {
      message.body = data
    }

    this.#write(message)
    this.#isFinished = true
  }

  /**
  * @summary Finish response with an error.
  *
  * @description This method will send a `Message` with type `err`, signifying
  * to the recipient that an error has occurred during processing, and to expect
  * no more data on this correspondence. The error itself will be present as a
  * dedicated field in the response, to convey information to the recipient.
  *
  * After this call, the response will be considered as finished.
  *
  * Calling this on a finished response is considered an error.
  *
  * @param {MessageError} err Error
  */
  error (err) {
    assert(err.type, 'Error must have type!')
    assert(err.message, 'Error must have message!')

    this.#ensureWritable()

    const message = new Message({
      type: MessageTypes.Error,
      header: this.header,
      error: err
    })

    this.#write(message)
    this.#isFinished = true
  }

  #write (message) {
    // TODO: Consider custom serializer, e.g. for ajv
    const serialized = JSON.stringify(message)

    this.#stream.write(serialized + '\n')
  }

  #ensureWritable () {
    if (this.#isFinished) {
      throw new FinishedResponseError()
    }
  }
}
