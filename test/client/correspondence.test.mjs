import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import stream from 'node:stream'
import { IncomingCorrespondence } from '../../lib/client/correspondence.mjs'

describe('IncomingCorrespondence', () => {
  /** @type {IncomingCorrespondence} */
  let correspondence

  beforeEach(() => {
    correspondence = new IncomingCorrespondence(new stream.PassThrough())
  })

  it('should emit data', () => { assert.fail('TODO') })
  it('should emit finish', () => { assert.fail('TODO') })
  it('should emit data and finish', () => { assert.fail('TODO') })
  it('should emit error', () => { assert.fail('TODO') })

  it('should gather', () => { assert.fail('TODO') })

  it('should return on promise', () => { assert.fail('TODO') })
  it('should throw on promise', () => { assert.fail('TODO') })

  it('should return chunk on promiseSingle', () => { assert.fail('TODO') })
  it('should throw on promiseSingle', () => { assert.fail('TODO') })

  it('should return chunks on promiseAll', () => { assert.fail('TODO') })
  it('should throw on promiseAll', () => { assert.fail('TODO') })
})
