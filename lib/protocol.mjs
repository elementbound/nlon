import { nanoid } from 'nanoid'

/**
* @typedef {string} MessageType
*/

/**
* Enum for message types
* @readonly
* @enum {MessageType}
*/
export const MessageTypes = Object.freeze({
  Request: 'req',
  Data: 'data',
  Error: 'err',
  Finish: 'fin'
})

/**
* Message header
*/
export class MessageHeader {
  /**
  * Correspondence ID, to track request-response pairs.
  *
  * @type {string}
  */
  correspondenceId

  /**
  * Subject of the correspondence, letting the recipient know what action
  * to perform.
  *
  * @type {string}
  */
  subject

  /**
  * An optional authorization string. Its use is entirely dependent on the
  * application.
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
* Message error
*/
export class MessageError {
  /**
  * A short string indicating the error type
  *
  * @type {string}
  */
  type

  /**
  * An arbitrary string indicating the error message
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
* Message
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
    // options && Object.assign(this, options)
    options.type && (this.type = options.type)
    options.header && (this.header = options.header)
    options.error && (this.error = options.error)
    options.body && (this.body = options.body)
  }
}
