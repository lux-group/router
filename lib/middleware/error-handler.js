const Sentry = require('@sentry/node')
const { HTTPError, ServerError } = require('../errors')

module.exports = exports = (err, req, res, next) => {
  if (!(err instanceof HTTPError)) {
    console.error('Unexpected error', err) // log the original error
    err = new ServerError(err.message || 'Something went wrong')
  } else if (err instanceof ServerError) {
    console.error('Unexpected error', err) // log manually thrown server errors too!
  }
  Sentry.captureException('Unexpected error', err)
  res.status(err.code).json(err.responseJson)
}