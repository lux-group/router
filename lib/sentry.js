const errors = require('./errors')

let Sentry

if (process.env.LAMBDA_TASK_ROOT) {
  Sentry = require('@sentry/serverless')
} else {
  Sentry = require('@sentry/node')
}

let initialized = false

const initialize = (opts) => {
  const logger = opts.logger || console
  const appEnv = opts.appEnv || 'unknown'
  const initializationSkipWarn = ['production', 'unknown'].includes(appEnv)

  if (!Sentry && initializationSkipWarn) {
    logger.warn('Sentry is not installed, skipping initialization.')
    return initialized
  }

  if (!opts.sentryDSN && initializationSkipWarn) {
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
    if (!initialize(opts)) return

    app.use(Sentry.Handlers.requestHandler())
  }
}
