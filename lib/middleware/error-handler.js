const { HTTPError, ServerError } = require('../errors')

module.exports = exports = (err, req, res, next) => {
  if (!(err instanceof HTTPError)) {
    err = new ServerError(err.message || 'Something went wrong')
  }

  if (err instanceof ServerError) {
    console.error('Unexpected error', err)
  }

  res.status(err.code).json(err.responseJson)
}
