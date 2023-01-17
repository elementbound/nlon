import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { InspectableStream } from '../inspectable.stream.mjs'
import { Client } from '../../lib/client/client.mjs'

describe('Client', () => {
  /** @type {InspectableStream} */
  let stream

  /** @type {Client} */
  let client

  beforeEach(() => {
    stream = new InspectableStream()
    client = new Client(stream)
  })

  it('should write on send', () => assert.fail('todo'))
  it('should call correspondence', () => assert.fail('todo'))

  it('should receive new', () => assert.fail('todo'))
  it('should not receive known', () => assert.fail('todo'))

  it('should emit on unknown correspondence', () => assert.fail('todo'))
  it('should not emit on known correspondence', () => assert.fail('todo'))
  it('should emit error on stream error', () => assert.fail('todo'))
  it('should emit error on invalid message', () => assert.fail('todo'))
  it('should emit close', () => assert.fail('todo'))
})
