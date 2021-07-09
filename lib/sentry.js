const Sentry = require('@sentry/node')
const errors = require('./errors')

module.exports = {
  handleErrors: (app, opts) => {
    const logger = opts.logger || console
    if (!opts.sentryDSN) return

    logger.debug('Setting up Sentry errorHandler')
    app.use(Sentry.Handlers.errorHandler())
  },
  handleRequests: (app, opts) => {
    const logger = opts.logger || console
    const appEnv = opts.appEnv || 'unknown'

    if (!opts.sentryDSN) {
      logger.warn('No Sentry DSN configured, skipping initialization.')
      return
    }

    logger.info(`Initializing Sentry for env ${appEnv}...`)
    try {
      Sentry.init({
        dsn: opts.sentryDSN,
        environment: appEnv,
        beforeSend: (event, hint) => {
          logger.debug({ message: 'in beforeSend', hint })
          if (!hint) return event

          // Do report manually thrown ServerErrors
          if (hint.originalException instanceof errors.ServerError) return event

          // Don't report other HTTPErrors as they are expected.
          if (hint.originalException instanceof errors.HTTPError) return null

          return event
        }
      })

      app.use(Sentry.Handlers.requestHandler())
    } catch (error) {
      logger.warn(`Could not initialize Sentry with DSN: ${opts.sentryDSN}`)
      logger.warn(error)
      return null
    }
  }
}
