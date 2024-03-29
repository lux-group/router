const uuid = require('../utils/uuid')

module.exports = exports = ({ correlationIdExtractor, logger = console, shouldLogResponses = true }) => {
  return async function networkLoggerMiddleware (req, res, next) {
    const correlationId = correlationIdExtractor ? correlationIdExtractor(req, res) : uuid.get()
    logger.info(`request: (${correlationId}) ${req.method} ${req.url} ${req.body ? JSON.stringify(req.body) : ''}`)
    const originalFunc = res.json
    res.json = (responseBody) => {
      if (shouldLogResponses) {
        logger.info(`response: (${correlationId}) ${res.statusCode}: ${JSON.stringify(responseBody)}`)
      }
      return originalFunc.call(res, responseBody)
    }
    next()
  }
}
