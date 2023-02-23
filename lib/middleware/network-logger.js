const uuid = require('../utils/uuid')

module.exports = exports = ({ correlationIdExtractor, logger = console, shouldLogMemoryUsage = false, shouldLogResponses = true }) => {
  return async (req, res, next) => {
    const correlationId = correlationIdExtractor ? correlationIdExtractor(req, res) : uuid.get()
    let usedBefore = 0;
    if (shouldLogMemoryUsage) {
      usedBefore = process.memoryUsage().heapUsed / 1024 / 1024;
    }
    logger.info(`request: (${correlationId}) ${req.method}${shouldLogMemoryUsage ? ` ${Math.round(usedBefore * 100) / 100} ` : ' '}${req.url} ${req.body ? JSON.stringify(req.body) : ''}`)
    const originalFunc = res.json
    res.json = (responseBody) => {
      let usedAfter = 0;
      if (shouldLogMemoryUsage) {
        usedAfter = process.memoryUsage().heapUsed / 1024 / 1024;
      }
      if (shouldLogResponses) {
        logger.info(`response: (${correlationId}) ${res.statusCode}${shouldLogMemoryUsage ? ` ${Math.round(usedAfter * 100) / 100}` : ''}: ${JSON.stringify(responseBody)}`)
      } else {
        logger.info(`response: (${correlationId}) ${res.statusCode}${shouldLogMemoryUsage ? ` ${Math.round(usedAfter * 100) / 100}` : ''}`)
      }
      return originalFunc.call(res, responseBody)
    }
    next()
  }
}
 