/**
* Send NLON message to stream
* @param {InspectableStream} stream Stream
* @param {string|object} message Message
*/
export function send (stream, message) {
  if (typeof message === 'string') {
    stream.inject(message + '\n')
  } else {
    stream.inject(JSON.stringify(message) + '\n')
  }
}
