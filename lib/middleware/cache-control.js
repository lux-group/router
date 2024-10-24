module.exports = exports = ({ cacheControlString }) => {
  return function responseCacheControl (req, res, next) {
    const originalFunc = res.json
    res.json = (responseBody) => {
      res.set('Cache-Control', cacheControlString)
      return originalFunc.call(res, responseBody)
    }
    next()
  }
}
