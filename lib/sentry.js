let Sentry
try {
  Sentry = require('@sentry/node')
} catch (e) {
  console.warn('Could not require optional dependency @sentry/node')
}

const errors = require('./errors')

let initialized = false

const initialize = (opts) => {
  const logger = opts.logger || console
  const appEnv = opts.appEnv || 'unknown'

  if (!opts.sentryDSN) {
    logger.warn('No Sentry DSN configured, skipping initialization.')
    return initialized
  }

  logger.info(`Initializing Sentry for env ${appEnv}...`)
  try {
    Sentry.init({
      dsn: opts.sentryDSN,
      environment: appEnv,
      beforeSend: (event, hint) => {
        if (!hint) return event

        // Do report manually thrown ServerErrors
        if (hint.originalException instanceof errors.ServerError) return event

        // Don't report other HTTPErrors as they are expected.
        if (hint.originalException instanceof errors.HTTPError) return null

        return event
      }
    })
    logger.info(Sentry)
    logger.info('Sentry initialized.')
    initialized = true
    return initialized
  } catch (error) {
    logger.warn(`Could not initialize Sentry with DSN: ${opts.sentryDSN}`)
    logger.warn(error)
    return initialized
  }
}

module.exports = {
  handleErrors: (app, opts) => {
    const logger = opts.logger || console
    if (!initialized) return

    logger.debug('Setting up Sentry errorHandler')
    app.use(Sentry.Handlers.errorHandler())
  },
  initialize,
  handleRequests: (app, opts) => {
    initialize(opts)
    if (!initialized) return

    app.use(Sentry.Handlers.requestHandler())
  }
}
