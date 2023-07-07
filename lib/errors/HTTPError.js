class HTTPError extends Error {
  constructor (code, message, errors, refCode) {
    super(message)
    Error.captureStackTrace(this, HTTPError)
    this.code = code
    this.errors = errors || [message]
    this.refCode = refCode
    this.status = code
    this.responseJson = {
      status: this.code,
      message: this.message,
      errors: this.errors,
      ref_code: this.refCode,
      stack: this.stack
    }
  }
}

module.exports = exports = HTTPError
