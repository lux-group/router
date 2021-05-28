const { InvalidRequestError } = require('../errors')

const safeParse = (matcher, data) => {
  if (matcher.safeParse) {
    return matcher.safeParse(data)
  }

  return { errors: matcher.match(data), value: data }
}

module.exports = ({ logger = console, schema, warnOnRequestValidationError, mutateParams = false, mutateQuery = false }) => {
  return (req, res, next) => {
    if (schema.params) {
      let result = safeParse(schema.params, req.params)

      if (result.errors.length) {
        if (warnOnRequestValidationError) {
          logger.warn('[VALIDATION WARNING] Invalid url path parameters', JSON.stringify(result.errors))
        } else {
          throw new InvalidRequestError('Invalid url path parameters', result.errors)
        }
      } else if (mutateParams) {
        if (!schema.params.safeParse) {
          logger.warn('Your version of strummer does not support mutateParams')
        } else {
          req.params = result.value
        }
      }
    }
    if (schema.query) {
      let result = safeParse(schema.query, req.query)

      if (result.errors.length) {
        if (warnOnRequestValidationError) {
          logger.warn('[VALIDATION WARNING] Invalid url query parameters', JSON.stringify(result.errors))
        } else {
          throw new InvalidRequestError('Invalid url query parameters', result.errors)
        }
      } else if (mutateQuery) {
        if (!schema.query.safeParse) {
          logger.warn('Your version of strummer does not support mutateQuery')
        } else {
          req.query = result.value
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
