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
    this.with = undefined
    /** @private */
    this.next = undefined
    /** @private */
    this.all = undefined
  }

  /** @private */
  get readable () {
    return undefined
  }
}
