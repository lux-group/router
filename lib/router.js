const express = require('express')
const swaggerUi = require('swagger-ui-express')

const generateSwagger = require('./generate-swagger')
const asyncMiddleware = require('./middleware/async')
const createErrorHandler = require('./middleware/error-handler')
const networkLogger = require('./middleware/network-logger')
const requestValidator = require('./middleware/request-validator')
const responseValidator = require('./middleware/response-validator')
const sentry = require('./sentry')

const handle = (
  app,
  method,
  routeDefinitions,
  { validateResponses, logRequests, logResponses, correlationIdExtractor, logger, appEnv },
  { url, operationId, preHandlers, handlers, schema, isPublic, tags, summary, description, deprecated, warnOnRequestValidationError, jsonOptions }
) => {
  let _handlers = [express.json(jsonOptions || {})]

  if (routeDefinitions[method][url]) {
    throw new Error(`Route already defined: (${method}) ${url}`)
  }

  routeDefinitions[method][url] = { url, operationId, schema, isPublic, tags, summary, description, deprecated }

  const shouldLogRequests = (logRequests === undefined && appEnv === 'development') || logRequests
  const shouldLogResponses = (logResponses === undefined && appEnv === 'development') || logResponses

  if (shouldLogRequests) {
    _handlers.push(networkLogger({ correlationIdExtractor, logger, shouldLogResponses }))
  }

  if (preHandlers && preHandlers.length) {
    _handlers.push(...preHandlers)
  }

  if (schema && schema.request) {
    _handlers.push(requestValidator({ logger, schema: schema.request, warnOnRequestValidationError }))
  }

  if (validateResponses && schema && schema.responses) {
    _handlers.push(responseValidator({ schema: schema.responses }))
  }

  _handlers = [..._handlers, ...handlers].map(handler => {
    const wrappedHandler = asyncMiddleware(handler)
    // this ensures that the original middleware name is preserved and not rewritten to 'asyncMiddleware'
    Object.defineProperty(wrappedHandler, 'name', {
      writable: false,
      value: handler.name
    })
    return wrappedHandler
  })
  app[method](url, _handlers)
}

module.exports = exports = (app, opts = { }) => {
  let routeDefinitions = {
    options: {},
    head: {},
    get: {},
    post: {},
    put: {},
    delete: {},
    patch: {}
  }

  const router = {
    app: app,
    options: handle.bind(null, app, 'options', routeDefinitions, opts),
    head: handle.bind(null, app, 'head', routeDefinitions, opts),
    get: handle.bind(null, app, 'get', routeDefinitions, opts),
    post: handle.bind(null, app, 'post', routeDefinitions, opts),
    put: handle.bind(null, app, 'put', routeDefinitions, opts),
    delete: handle.bind(null, app, 'delete', routeDefinitions, opts),
    patch: handle.bind(null, app, 'patch', routeDefinitions, opts),
    schema: ({ url, schema }) => {
      const response = ['get', 'post', 'put'].reduce((response, verb) => {
        if (schema[verb]) {
          const requestSchema = schema[verb].request
          if (requestSchema) {
            response[verb] = Object.keys(requestSchema).reduce(
              (schema, key) => {
                schema[key] = requestSchema[key].toJSONSchema()
                return schema
              },
              {}
            )
          }
        }
        return response
      }, {})
      app.options(url, (req, res, next) => {
        res.json(response)
      })
    },
    toSwagger: () => {
      return generateSwagger(routeDefinitions, opts.swaggerBaseProperties)
    },
    serveSwagger: (path) => {
      const { preHandlers } = opts.swaggerBaseProperties
      if (preHandlers && preHandlers.length) {
        preHandlers.forEach(handler => app.use(path, asyncMiddleware(handler)))
      }

      const swaggerJson = generateSwagger(routeDefinitions, opts.swaggerBaseProperties)
      app.get(`${path}/swagger.json`, async (req, res) => { res.json(swaggerJson) })
      app.use(path, swaggerUi.serve, swaggerUi.setup(swaggerJson))
    },
    useErrorHandler: () => {
      sentry.handleErrors(app, opts)
      const errorHandler = createErrorHandler(opts)
      app.use(errorHandler)
    }
  }

  sentry.handleRequests(app, opts)

  return router
}
