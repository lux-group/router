const { InvalidRequestError } = require('../errors')

module.exports = ({ logger = console, schema, warnOnRequestValidationError }) => {
  return (req, res, next) => {
    if (schema.params) {
      let result = schema.params.safeParse(req.params)
      if (result.errors.length) {
        if (warnOnRequestValidationError) {
          logger.warn('[VALIDATION WARNING] Invalid url path parameters', JSON.stringify(result.errors))
        } else {
          throw new InvalidRequestError('Invalid url path parameters', result.errors)
        }
      } else {
        req.params = result.value;
      }
    }
    if (schema.query) {
      let result = schema.query.safeParse(req.query)
      if (result.errors.length) {
        if (warnOnRequestValidationError) {
          logger.warn('[VALIDATION WARNING] Invalid url query parameters', JSON.stringify(result.errors))
        } else {
          throw new InvalidRequestError('Invalid url query parameters', result.errors)
        }
      } else {
        req.query = result.value;
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
