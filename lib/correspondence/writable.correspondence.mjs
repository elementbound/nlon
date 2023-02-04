import { Correspondence } from './correspondence.mjs'

/**
* Write-only correspondence
*
* @extends Correspondence
*/
export class WritableCorrespondence extends Correspondence {
  constructor () {
    super(...arguments)

    /** @private */
    this.handle = undefined
    /** @private */
    this.next = undefined
    /** @private */
    this.all = undefined

    /** @private */
    this.asReadable = undefined
    /** @private */
    this.asWritable = undefined
  }

  /** @private */
  get readable () {
    return undefined
  }

  /** @private */
  get context () {
    return undefined
  }
}
