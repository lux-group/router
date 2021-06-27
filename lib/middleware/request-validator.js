
const Sentry = require('@sentry/node')
const { InvalidRequestError } = require('../errors')

const errorManager = ({ logger, warnOnRequestValidationError, typeError, errors }) => {
  if (errors.length) {
    if (warnOnRequestValidationError) {
      logger.warn(`[VALIDATION WARNING] Invalid ${typeError}: ${JSON.stringify(errors)}`)
    } else {
      Sentry.captureException(`Invalid ${typeError}: ${JSON.stringify(errors)}`)
      logger.error(`Invalid ${typeError}: ${JSON.stringify(errors)}`)
      throw new InvalidRequestError(`Invalid ${typeError}`, errors)
    }
  }
}

module.exports = ({ logger = console, schema, warnOnRequestValidationError }) => {
  return (req, res, next) => {
    if (schema.params) {
      let errors = schema.params.match(req.params)
      errorManager({ logger, warnOnRequestValidationError, typeError: 'url path parameters', errors })
    }
    if (schema.query) {
      let errors = schema.query.match(req.query)
      errorManager({ logger, warnOnRequestValidationError, typeError: 'url query parameters', errors })
    }
    if (schema.body) {
      let errors = schema.body.match(req.body)
      errorManager({ logger, warnOnRequestValidationError, typeError: 'payload', errors })
    }
    next()
  }
}
