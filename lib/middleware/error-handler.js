const { HTTPError, ServerError } = require('../errors');

module.exports = exports = (opts) => {
  /* this function returns the errorHandler function that is
   * used when an express app throws an unexpected error
   * this will result in a http status code in the 500 range
   *
   * passing in the luxuryescapes logger into the function will result in
   * much nicer stack traces within new relic, if not console will be used to log
   * and this will result in multiline messages within new relic.
   */
  const logger = opts?.logger || console;
  const errorHandler = (err, req, res, next) => {
    err.http_status = err.code || 500;
    err.http_method = req.method;
    err.http_path = req.url;
    if (!(err instanceof HTTPError)) {
      logger.error('Unexpected error', err); // log the original error
      err = new ServerError(err.message || 'Something went wrong');
    } else if (err instanceof ServerError) {
      logger.error('Unexpected error', err); // log manually thrown server errors too!
    }
    res.status(err.code).json(err.responseJson);
  };
  return errorHandler;
};
