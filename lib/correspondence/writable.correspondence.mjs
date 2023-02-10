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
  }

  /** @private */
  get readable () {
    return undefined
  }

  /** @private */
  get context () {
    return undefined
  }

  /**
  * @summary Wrap a correspondence as write-only
  *
  * @description This method will return a write-only proxy to the target
  * correspondence. This also means that if either the original or the proxy
  * correspondence becomes unwritable, both of them become unwritable.
  *
  * @param {Correspondence} correspondence Target correspondence
  * @returns {WritableCorrespondence} Write-only proxy
  */
  static wrap (correspondence) {
    const writable = new WritableCorrespondence()
    return this._proxy(correspondence, writable)
  }
}
