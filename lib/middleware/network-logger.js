const uuid = require('../utils/uuid')

module.exports = exports = ({ correlationIdExtractor, logger = console, shouldLogResponses = true }) => {
  return async (req, res, next) => {
    const correlationId = correlationIdExtractor ? correlationIdExtractor(req, res) : uuid.get()
    const usedBefore = process.memoryUsage().heapUsed / 1024 / 1024;
    logger.info(`request: (${correlationId}) ${req.method} ${Math.round(usedBefore * 100) / 100} ${req.url} ${req.body ? JSON.stringify(req.body) : ''}`)
    const originalFunc = res.json
    res.json = (responseBody) => {
      const usedAfter = process.memoryUsage().heapUsed / 1024 / 1024;
      if (shouldLogResponses) {
        logger.info(`response: (${correlationId}) ${res.statusCode} ${Math.round(usedAfter * 100) / 100}: ${JSON.stringify(responseBody)}`)
      } else {
        logger.info(`response: (${correlationId}) ${res.statusCode} ${Math.round(usedAfter * 100) / 100}`)
      }
      return originalFunc.call(res, responseBody)
    }
    next()
  }
}
 