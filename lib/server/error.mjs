export class InvalidMessageError extends Error {
  #stream
  #content

  constructor (stream, content, message) {
    super(message)

    this.#stream = stream
    this.#content = content
  }

  get stream () {
    return this.#stream
  }

  get content () {
    return this.#content
  }
}

export class StreamingError extends Error {
  #stream
  #cause

  constructor (stream, cause) {
    super(cause.message)

    this.#stream = stream
    this.#cause = cause
  }

  get stream () {
    return this.#cause
  }

  get cause () {
    return this.#cause
  }
}
