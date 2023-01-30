import { Correspondence } from './correspondence.mjs'

/**
* Read-only correspondence
*
* @extends Correspondence
*/
export class ReadableCorrespondence extends Correspondence {
  constructor () {
    super(...arguments)

    // Remove write-related members both from instance and autocomplete
    /** @private */
    this.write = undefined
    /** @private */
    this.finish = undefined
    /** @private */
    this.error = undefined
  }

  /** @private */
  get writable () {
    return undefined
  }
}
