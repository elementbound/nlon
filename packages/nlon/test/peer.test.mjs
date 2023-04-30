import { describe, it, beforeEach, mock } from 'node:test'
import assert from 'node:assert'
import { InspectableStream } from './inspectable.stream.mjs'
import { Peer } from '../lib/peer.mjs'
import { Message, MessageHeader, MessageTypes } from '../lib/protocol.mjs'
import { objectify, send } from './utils.mjs'

describe('Peer', () => {
  /** @type {InspectableStream} */
  let stream

  /** @type {Peer} */
  let peer

  function setup () {
    stream = new InspectableStream({ emitOnInject: true })
    peer = new Peer(stream)
  }

  describe('send', () => {
    beforeEach(setup)

    it('should write', () => {
      // Given
      const expected = new Message({
        header: new MessageHeader({ subject: 'test' })
      })

      // When
      peer.send(expected)
      const actual = stream.fromJSON()

      // Then
      assert.deepStrictEqual(objectify(actual), objectify(expected),
        'Message not written to stream!')
    })

    it('should finish', () => {
      // Given
      const expected = new Message({
        header: new MessageHeader({ subject: 'test' }),
        type: MessageTypes.Finish,
        body: 'Bye!'
      })

      // When
      const corr = peer.send(expected)
      const actual = stream.fromJSON()

      // Then
      assert.deepStrictEqual(objectify(actual), objectify(expected))
      assert(!corr.writable)
    })

    it('should error', () => {
      // Given
      const expected = new Message({
        header: new MessageHeader({ subject: 'test' }),
        type: MessageTypes.Error,
        error: {
          type: 'Test',
          message: 'Test error!'
        }
      })

      // When
      const corr = peer.send(expected)
      const actual = stream.fromJSON()

      // Then
      assert.deepStrictEqual(objectify(actual), objectify(expected))
      assert(!corr.writable)
    })

    it('should call correspondence', () => {
      // Given
      const message = new Message({
        header: new MessageHeader({ subject: 'test' }),
        type: MessageTypes.Data,
        body: 'ping'
      })

      const reply = new Message({
        header: new MessageHeader({
          subject: 'test',
          correspondenceId: message.header.correspondenceId
        }),

        type: MessageTypes.Finish,
        body: 'pong'
      })

      const correspondence = peer.send(message)
      correspondence.handle = mock.fn()

      // When
      send(stream, reply)

      // Then
      const handleCalls = correspondence.handle.mock.calls
      assert.equal(handleCalls.length, 1, 'Correspondence wasn\'t called!')
      assert.deepStrictEqual(
        objectify(handleCalls[0].arguments), objectify([reply]),
        'Correspondence called with wrong data!')
    })

    it('should throw after disconnect', () => {
      // Given
      const message = new Message({
        header: new MessageHeader({ subject: 'test' }),
        type: MessageTypes.Data
      })
      peer.disconnect()

      // When + then
      assert.throws(() => peer.send(message))
    })
  })

  describe('correspond', () => {
    beforeEach(setup)

    it('should create new correspondence', () => {
      // Given
      const header = new MessageHeader({
        correspondenceId: 'test001',
        subject: 'test',
        authorization: 'supersecret',
        customHeader: 'foo'
      })

      // When
      const correspondence = peer.correspond(header)

      // Then
      assert(correspondence)
      assert.deepEqual(correspondence.header, header)
    })

    it('should throw on invalid header', () => {
      // Given
      const header = {}

      // When + Then
      assert.throws(
        () => peer.correspond(header)
      )
    })

    it('should throw after disconnect', () => {
      // Given
      const header = new MessageHeader({
        correspondenceId: 'test001',
        subject: 'test',
        authorization: 'supersecret',
        customHeader: 'foo'
      })

      peer.disconnect()

      // When + Then
      assert.throws(
        () => peer.correspond(header)
      )
    })
  })

  describe('receive', () => {
    beforeEach(setup)

    it('should receive new', async () => {
      // Given
      const expected = new Message({
        header: new MessageHeader({ subject: 'test' }),
        type: MessageTypes.Data,
        body: 'ping'
      })

      const promise = peer.receive()

      // When
      send(stream, expected)

      // Then
      const actual = await promise
      assert.deepStrictEqual(objectify(actual.header), objectify(expected.header),
        'Wrong message received!')
    })

    it('should throw after disconnect', () => {
      // Given
      peer.disconnect()

      // When + then
      assert.throws(() => peer.receive())
    })
  })

  describe('events', () => {
    beforeEach(setup)

    it('should emit on unknown correspondence', () => {
      // Given
      const message = new Message({
        header: new MessageHeader({ subject: 'test' }),
        type: MessageTypes.Data,
        body: 'ping'
      })

      const handler = mock.fn()
      peer.on('correspondence', handler)

      // When
      send(stream, message)

      // Then
      assert.equal(handler.mock.callCount(), 1, 'No event was emitted!')
    })

    it('should emit error on stream error', () => {
      // Given
      const handler = mock.fn()
      peer.on('error', handler)

      // When
      stream.emit('error', new Error('Stream error'))

      // Then
      assert.equal(handler.mock.callCount(), 1, 'No event was emitted!')
    })

    it('should emit error on invalid message', () => {
      // Given
      const handler = mock.fn()
      peer.on('error', handler)

      // When
      send(stream, {})

      // Then
      assert.equal(handler.mock.callCount(), 1, 'No event was emitted!')
    })

    it('should emit disconnect on stream close', () => {
      // Given
      const handler = mock.fn()
      peer.on('disconnect', handler)

      // When
      stream.emit('close')

      // Then
      assert.equal(handler.mock.callCount(), 1, 'No event was emitted!')
    })

    it('should emit disconnect', () => {
      // Given
      const handler = mock.fn()
      peer.on('disconnect', handler)

      // When
      peer.disconnect()

      // Then
      assert.equal(handler.mock.callCount(), 1, 'No event was emitted!')
    })
  })
})
