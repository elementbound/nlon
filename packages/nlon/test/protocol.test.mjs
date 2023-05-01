import { describe, it } from 'node:test'
import assert from 'node:assert'
import { Message, MessageHeader, MessageTypes } from '../lib/protocol.mjs'

describe('MessageHeader', () => {
  const invalidHeaders = [
    [undefined, 'missing header'],
    [{}, 'empty header'],
    [{ correspondenceId: '' }, 'empty correspondenceId'],
    [{ correspondenceId: 'test' }, 'missing subject'],
    [{ correspondenceId: 'test', subject: ''}, 'empty subject'],
  ]

  const validHeaders = [
    [{ correspondenceId: 'test', subject: 'foo' }, 'valid header'],
    [{ correspondenceId: 'test', subject: 'foo', authorization: 'yes' }, 'with authorization'],
    [{ correspondenceId: 'test', subject: 'foo', foo: 'bar' }, 'with custom header']
  ]

  for (const [message, name] of invalidHeaders) {
    it(`should throw on validate - ${name}`, () => {
      // When + Then
      assert.throws(
        () => MessageHeader.validate(message)
      )
    })
  }

  for (const [message, name] of validHeaders) {
    it(`should accept on validate - ${name}`, () => {
      // When + Then
      assert.doesNotThrow(
        () => MessageHeader.validate(message)
      )
    })
  }
})

describe('Message', () => {
  const invalidMessages = [
    [{}, 'missing header'],
    [{ header: {} }, 'empty header'],
    [{ header: { correspondenceId: '' } }, 'empty correspondenceId'],
    [{ header: { correspondenceId: 'test', subject: '' } }, 'empty subject'],
    [{ header: { correspondenceId: 'test', subject: 'test' } }, 'missing type'],
    [
      { header: { correspondenceId: 'test', subject: 'test' }, type: 'foo' },
      'invalid type'
    ]
  ]

  const validMessages = [
    [
      new Message({
        header: new MessageHeader({
          correspondenceId: 'test',
          subject: 'test'
        }),
        type: MessageTypes.Data
      }),
      'without body and authorization'
    ],

    [
      new Message({
        header: new MessageHeader({
          correspondenceId: 'test',
          subject: 'test',
          authorization: 'super-secret'
        }),
        type: MessageTypes.Data
      }),
      'without body'
    ],

    [
      new Message({
        header: new MessageHeader({
          correspondenceId: 'test',
          subject: 'test',
          authorization: 'super-secret'
        }),
        type: MessageTypes.Data,
        body: 'Hello world!'
      }),
      'with body'
    ]
  ]

  for (const [message, name] of invalidMessages) {
    it(`should throw on validate - ${name}`, () => {
      // When + Then
      assert.throws(
        () => Message.validate(message)
      )
    })
  }

  for (const [message, name] of validMessages) {
    it(`should accept on validate - ${name}`, () => {
      // When + Then
      assert.doesNotThrow(
        () => Message.validate(message)
      )
    })
  }
})
