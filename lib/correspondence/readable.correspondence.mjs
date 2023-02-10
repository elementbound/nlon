import { Correspondence } from './correspondence.mjs'

/**
* Read-only correspondence
*
* @extends Correspondence
*/
export class ReadableCorrespondence extends Correspondence {
  /**
  * @param {object} options
  * @param {MessageHeader} options.header
  */
  constructor (options) {
    super()

    // Remove write-related members both from instance and autocomplete
    /** @private */
    this.write = undefined
    /** @private */
    this.finish = undefined
    /** @private */
    this.error = undefined

    /** @private */
    this.asReadable = undefined
    /** @private */
    this.asWritable = undefined
  }

  /** @private */
  get writable () {
    return undefined
  }

  /**
  * @summary Wrap a correspondence as read-only
  *
  * @description This method will return a read-only proxy to the target
  * correspondence. This also means that if either the original or the proxy
  * correspondence becomes unreadable, both of them become unwritable.
  *
  * @param {Correspondence} correspondence Target correspondence
  * @returns {ReadableCorrespondence} Read-only proxy
  */
  static wrap (correspondence) {
    const readable = new ReadableCorrespondence()
    return this._proxy(correspondence, readable)
  }
}
