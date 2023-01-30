import { BaseCorrespondence } from './base.correspondence.mjs'
import { ReadableCorrespondence } from './readable.correspondence.mjs'
import { WritableCorrespondence } from './writable.correspondence.mjs'

/**
* Bidirectional correspondence
*
* @mixes ReadableCorrespondence
* @mixes WritableCorrespondence
* @extends BaseCorrespondence
*/
export class Correspondence extends BaseCorrespondence {
  // HACK: These will be overwritten by mixins, only added to get autocomplete.
  // HACK: Looks like tsserver doesn't understand mixins
  with () { }
  next () { }
  all () { }

  write () { }
  finish () { }
  error () { }

  get readable () { }
  get writable () { }
}

Object.assign(Correspondence.prototype,
  ReadableCorrespondence, WritableCorrespondence)
