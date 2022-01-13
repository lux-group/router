const uuid = require('../utils/uuid')

module.exports = exports = ({ correlationIdExtractor, logger = console }) => {
  return async (req, res, next) => {
    const correlationId = correlationIdExtractor ? correlationIdExtractor(req, res) : uuid.get()
    logger.log(`request: (${correlationId}) ${req.method} ${req.url} ${req.body ? JSON.stringify(req.body) : ''}`)
    const originalFunc = res.json
    res.json = (responseBody) => {
      logger.log(`response: (${correlationId}) ${res.statusCode}: ${JSON.stringify(responseBody)}`)
      return originalFunc.call(res, responseBody)
    }
    next()
  }
}
