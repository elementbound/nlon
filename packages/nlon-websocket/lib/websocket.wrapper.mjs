import * as stream from 'node:stream'

export class WebSocketStream extends stream.Duplex {
  /** @type {WebSocket} */
  #ws

  /**
  * @param {WebSocket} ws
  * @param {stream.DuplexOptions} options
  */
  constructor (ws, options) {
    super(options)

    this.#ws = ws

    ws.onclose = () => this.push(null)
    ws.onerror = err => this.destroy(err)
    ws.onmessage = message => this.push(message.data)
  }

  _write (chunk, _encoding, callback) {
    try {
      this.#ws.send(chunk)
      callback()
    } catch (e) {
      callback(e)
    }
  }

  _read () {
    // TODO: Will this work?
    // Do nothing - data is pushed from subscriber
  }

  _destroy (err, callback) {
    this.#ws.close()
    super._destroy(err, callback)
  }
}
