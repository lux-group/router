const { ServerError } = require('../errors')

module.exports = exports = ({ schema }) => {
  return (req, res, next) => {
    const originalFunc = res.json
    res.json = (responseBody) => {
      if (schema[res.statusCode]) {
        let errors = schema[res.statusCode].match(responseBody)
        if (errors.length) {
          throw new ServerError('Response body does not match the specified schema', errors)
        }
      }
      return originalFunc.call(res, responseBody)
    }
    next()
  }
}
