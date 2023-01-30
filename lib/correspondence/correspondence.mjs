import stream from 'node:stream'

/**
* Bidirectional correspondence
*
* @extends BaseCorrespondence
*/
export class Correspondence extends stream.EventEmitter {
  /** Use callback */
  with (cb) {}
  /** Get next data */
  async next () {}
  /** Async generator with all data */
  async all () {}

  /** Send data */
  write (data) {}
  /** Send finish */
  finish (data) {}
  /** Send error */
  error (e) {}

  /** Check if readable */
  get readable () { return true }
  /** Check if writable */
  get writable () { return true }
}
