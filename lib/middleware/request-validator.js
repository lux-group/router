const { InvalidRequestError } = require('../errors')

module.exports = ({ logger = console, schema, warnOnRequestValidationError }) => {
  return (req, res, next) => {
    if (schema.params) {
      let errors = schema.params.match(req.params)

      if (errors.length) {
        if (warnOnRequestValidationError) {
          logger.warn('[VALIDATION WARNING] Invalid url path parameters', JSON.stringify(errors))
        } else {
          throw new InvalidRequestError('Invalid url path parameters', errors)
        }
      }
    }
    if (schema.query) {
      let errors = schema.query.match(req.query)
      if (errors.length) {
        if (warnOnRequestValidationError) {
          logger.warn('[VALIDATION WARNING] Invalid url query parameters', JSON.stringify(errors))
        } else {
          throw new InvalidRequestError('Invalid url query parameters', errors)
        }
      }
    }
    if (schema.body) {
      let errors = schema.body.match(req.body)
      if (errors.length) {
        if (warnOnRequestValidationError) {
          logger.warn('[VALIDATION WARNING] Invalid payload', JSON.stringify(errors))
        } else {
          throw new InvalidRequestError('Invalid payload', errors)
        }
      }
    }
    next()
  }
}
