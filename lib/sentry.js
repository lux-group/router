const errors = require('./errors')
const sanitizeObject = require('./utils/sanitizer').sanitizeObject

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

  if (!Sentry) {
    if (initializationSkipWarn) {
      logger.warn('Sentry is not installed, skipping initialization.')
    }
    return initialized
  }

  if (!opts.sentryDSN) {
    if (initializationSkipWarn) {
      logger.warn('No Sentry DSN configured, skipping initialization.')
    }
    return initialized
  }

  logger.info(`Initializing Sentry for env ${appEnv}...`)
  try {
    Sentry.init({
      dsn: opts.sentryDSN,
      environment: appEnv,
      beforeSend: (event, hint) => {
        // Don't report other HTTPErrors as they are expected.
        if (hint && hint.originalException instanceof errors.HTTPError) return null

        if (opts.sanitizeKeys) {
          const sanitizeKeys = opts.sanitizeKeys
          sanitizeObject(event.request.cookies, sanitizeKeys)
          sanitizeObject(event.request.headers, sanitizeKeys)

          if (event.request.data) {
            event.request.data = JSON.stringify(sanitizeObject(JSON.parse(event.request.data), sanitizeKeys))
          }
        }

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
