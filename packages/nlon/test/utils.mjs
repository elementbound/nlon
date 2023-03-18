/**
* Send nlon message to stream
* @param {InspectableStream} stream Stream
* @param {string|object} message Message
* @private
*/
export async function send (stream, message) {
  if (typeof message === 'string') {
    stream.inject(message + '\n')
  } else {
    stream.inject(JSON.stringify(message) + '\n')
  }

  await sleep()
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

/**
* Sleep for duration.
*
* @param {number} [timeInMs=0]
* @returns {Promise<void>}
*/
export function sleep (timeInMs) {
  return new Promise(resolve => setTimeout(resolve, timeInMs ?? 0))
}

export function safeParse (value) {
  try {
    return JSON.parse(value)
  } catch (ex) {
    return value
  }
}
