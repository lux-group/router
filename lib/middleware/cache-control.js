module.exports = exports = ({ cacheControlString }) => {
  return function responseCacheControl (req, res, next) {
    // Save the original res.json function
    const originalFunc = res.json
    
    // Override res.json to set Cache-Control header
    res.json = (responseBody) => {
      res.set('Cache-Control', cacheControlString)
      return originalFunc.call(res, responseBody)
    }
    
    // Call the next middleware in the stack
    next()
  }
}