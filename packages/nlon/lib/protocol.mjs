import assert from 'node:assert'
import { nanoid } from 'nanoid'

/**
* @summary Enum for message types.
*
* @description Every message must belong to one of the following message types:
* - Data
*   - Carries a piece of data belonging to the correspondence.
*   - May occur 0 or more times in a correspondence.
* - Error
*   - Signifies that an error occurred during message processing.
*   - No more messages should be expected in the correspondence.
* - Finish
*   - Signifies that the correspondence has been closed, message has been
*   processed successfully.
*   - No more messages should be expected in the correspondence.
*
* Additionally, a special `Request` type exists. A message is a request in case
* its the first message belonging to a correspondence. In this case, the `type`
* field is not specified.
*
* @readonly
* @enum {MessageType}
* @typedef {string} MessageType
*/
export const MessageTypes = Object.freeze({
  Data: 'data',
  Error: 'err',
  Finish: 'fin'
})

/**
* @summary Message header.
*
* @description A message header all the information necessary to match the
* message to a correspondence, interpret the message body ( if any ) and decide
* how to process the message.
*/
export class MessageHeader {
  /**
  * Correspondence ID, to track request-response pairs.
  *
  * **Always required.**
  *
  * @type {string}
  */
  correspondenceId

  /**
  * Subject of the correspondence, letting the recipient know what action
  * to perform.
  *
  * Similar to HTTP's `path`.
  *
  * **Always required.**
  *
  * @type {string}
  */
  subject

  /**
  * An optional authorization string. Its use is entirely dependent on the
  * application.
  *
  * *Optional.*
  *
  * @type {string}
  */
  authorization

  /**
  * Construct a header.
  *
  * @param {MessageHeader} options Options
  */
  constructor (options) {
    options && Object.assign(this, options)
    this.correspondenceId ??= nanoid()
  }
}

/**
* @summary Message error.
*
* @description Represents an error description in case the original message's
* processing failed.
*
* It contains a short description of the issue, useful for programmatic use, and
* a longer description, to be used for any human-facing use cases.
*/
export class MessageError {
  /**
  * A short string indicating the error type.
  *
  * @type {string}
  */
  type

  /**
  * An arbitrary string indicating the error message.
  *
  * @type {string}
  */
  message

  /**
  * Construct an error.
  *
  * @param {MessageError} options Options
  */
  constructor (options) {
    options && Object.assign(this, options)
  }
}

/**
* @summary Message class, holding all the data of a well-formed NLON message.
*
* @description Messages belong to *correspondences*, similar to how emails can
* be organized into threads. Each correspondence begins with an initial message,
* to which multiple `data` responses may arrive, and finished with either an
* `error` or a `finish` message.
*
* Each correspondence has an ID so that messages can be easily grouped by
* correspondence. This is specified in the message header.
*
* To determine how to process the message, the message header also contains a
* `subject`, similar to HTTP's `path`.
*/
export class Message {
  /**
  * Message type
  *
  * @type {MessageType}
  */
  type

  /**
  * Message header
  *
  * @type {MessageHeader}
  */
  header = new MessageHeader()

  /**
  * @summary Message error
  *
  * @description If present, the body should be missing and can be safely ignored.
  *
  * @type {?MessageError}
  */
  error

  /**
  * Message body
  *
  * @type {any}
  */
  body

  /**
  * Construct a message.
  *
  * @param {Message} options Options
  */
  constructor (options) {
    options.type && (this.type = options.type)
    options.header && (this.header = options.header)
    options.error && (this.error = options.error)
    options.body && (this.body = options.body)
  }

  /**
  * Validate a message.
  *
  * @param {Message} message Message to validate
  * @throws On invalid messages
  */
  static validate (message) {
    assert(message?.header, 'Missing header!')
    assert(message?.header?.correspondenceId?.length > 0,
      'Missing correspondence id!')
    assert(message?.header?.subject?.length > 0, 'Missing subject!')
  }
}
