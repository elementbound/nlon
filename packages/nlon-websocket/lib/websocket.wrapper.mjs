import * as stream from 'node:stream'

/**
* @summary A Duplex stream implementation wrapping a WebSocket.
*
* @description This class can be used to treat a WebSocket as a regular stream.
* Under the hood it subscribes to the WebSocket's events and forwards any
* writes.
*
* @extends {stream.Duplex}
*/
export class WebSocketStream extends stream.Duplex {
  /** @type {WebSocket} */
  #ws

  /**
  * Wrap a WebSocket.
  *
  * @param {WebSocket} ws WebSocket to wrap
  * @param {stream.DuplexOptions} options Stream options
  */
  constructor (ws, options) {
    super(options)

    this.#ws = ws

    ws.onclose = () => this.push(null)
    ws.onerror = err => this.destroy(err)
    ws.onmessage = message => {
      const data = message.data
      if (data.constructor.name === 'Blob') {
        data.text()
          .then(t => {
            this.push(t)
          })
      } else {
        this.push(data.toString())
      }
    }
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
    // Do nothing - data is pushed from subscriber
  }

  _destroy (err, callback) {
    this.#ws.close()
    super._destroy(err, callback)
  }
}
