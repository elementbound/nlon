/**
* Writable correspondence
* @mixin
*/
export const WritableCorrespondence = {
  /** Send data */
  write () { },

  /** Send finish */
  finish () { },

  /** Send error */
  error () { },

  /** Check if writable, i.e. no finish or error sent */
  get writable () {
    return true
  }
}
