/**
* Readable correspondence
*
* @mixin
*/
export const ReadableCorrespondence = {
  /** Add constraint to next read block */
  with () { },

  /** Get next piece of data */
  // Maybe return Symbol if no data is available due to finish
  next: async () => { },

  /** Async generator with all messages */
  all: async () => { },

  /** Check if readable, i.e. no error or finish received yet */
  get readable () {
    return true
  }
}
