/**
* Send NLON message to stream
* @param {InspectableStream} stream Stream
* @param {string|object} message Message
* @private
*/
export function send (stream, message) {
  if (typeof message === 'string') {
    stream.inject(message + '\n')
  } else {
    stream.inject(JSON.stringify(message) + '\n')
  }
}

/**
* Convert any value / instance to object.
* Useful for `assert.deepStrictEquals`.
*
* @param {any} value Value
* @returns {object} Object
* @private
*/
export function objectify (value) {
  return JSON.parse(JSON.stringify(value))
}
