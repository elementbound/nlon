import stream from 'stream'

export class IncomingCorrespondence extends stream.EventEmitter {
  #stream
  #header
  #isFinished = false

  #chunks = undefined
  #isGathering = false

  handle (message) {
    // Emit event based on message
    // Update state
  }

  gather () { }

  promise () { }
  promiseAll () { }

  get chunks () {
    // TODO: throw if not gathering
  }

  // event: data
  // event: finish
  // event: error
}
