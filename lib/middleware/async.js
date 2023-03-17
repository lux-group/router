module.exports = exports = fn => {
  return function asyncMiddleware (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
