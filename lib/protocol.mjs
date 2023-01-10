/**
* @typedef {string} MessageType
*/

/**
* Enum for message types
* @readonly
* @enum {MessageType}
*/
export const MessageTypes = Object.freeze({
  /** Request message */
  Request: 'req',

  /** Data message */
  Data: 'data',

  /** Error message */
  Error: 'err',

  /** Correspondence finish message */
  Finish: 'fin'
})

/**
* Message header
*/
export class Header {
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
  * @param {Header} options Options
  */
  constructor (options) {
    options && Object.assign(this, options)
    this.correspondenceId ??= nanoid()
  }
}

/**
* Message error
*/
export class Error {
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
  * @type {Header}
  */
  header = new Header()

  /**
  * @summary Message error
  *
  * @description If present, the body should be missing and can be safely ignored.
  *
  * @type {?Error}
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
    options && Object.assign(this, options)
  }
}
