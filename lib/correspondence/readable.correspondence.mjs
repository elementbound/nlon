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
}
