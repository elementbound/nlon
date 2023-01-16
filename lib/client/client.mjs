import stream from 'stream'

export class Client extends stream.EventEmitter {
  /** @type {stream.Duplex} */
  #connection

  constructor (connection, options) {
    super()

    this.#connection = connection
    // TODO: Use options
  }

  send (message) {}
  async receive () {}
}
