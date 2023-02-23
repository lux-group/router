const uuid = require('../utils/uuid')

module.exports = exports = ({ correlationIdExtractor, logger = console, shouldLogResponses = true }) => {
  return async (req, res, next) => {
    const correlationId = correlationIdExtractor ? correlationIdExtractor(req, res) : uuid.get()
    const usedBefore = process.memoryUsage().heapUsed / 1024 / 1024;
    logger.info(`request: (${correlationId}) ${req.method} ${usedBefore} ${req.url} ${req.body ? JSON.stringify(req.body) : ''}`)
    const originalFunc = res.json
    res.json = (responseBody) => {
      const usedAfter = process.memoryUsage().heapUsed / 1024 / 1024;
      if (shouldLogResponses) {
        logger.info(`response: (${correlationId}) ${res.statusCode} ${usedAfter}: ${JSON.stringify(responseBody)}`)
      } else {
        logger.info(`response: (${correlationId}) ${res.statusCode} ${usedAfter}`)
      }
      return originalFunc.call(res, responseBody)
    }
    next()
  }
}
 