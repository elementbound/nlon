import { describe, it } from 'node:test'
import assert from 'node:assert'
import { Message, MessageHeader } from '../lib/protocol.mjs'

const invalidMessages = [
  [{}, 'missing header'],
  [{ header: {} }, 'empty header'],
  [{ header: { correspondenceId: '' } }, 'empty correspondenceId'],
  [{ header: { correspondenceId: 'test', subject: '' } }, 'empty subject']
]

const validMessages = [
  [
    new Message({
      header: new MessageHeader({
        correspondenceId: 'test',
        subject: 'test'
      })
    }),
    'without body and authorization'
  ],

  [
    new Message({
      header: new MessageHeader({
        correspondenceId: 'test',
        subject: 'test',
        authorization: 'super-secret'
      })
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

      body: 'Hello world!'
    }),
    'with body'
  ]
]

describe('Message', () => {
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
