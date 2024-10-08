[![CircleCI](https://circleci.com/gh/brandsExclusive/router/tree/master.svg?style=svg)](https://circleci.com/gh/brandsExclusive/router/tree/master)
[![NPM](http://img.shields.io/npm/v/@luxuryescapes/router.svg?style=flat-square)](https://npmjs.org/package/@luxuryescapes/router)

# router

> Opinionated wrapper around express

Opinionated wrapper around express, which adds in validation via [strummer](https://github.com/lux-group/strummer/) and documentation via [swagger](https://swagger.io/)

## Table of contents

- [Getting started](#getting-started)


## Getting started

```
npm install @luxuryescapes/router
```

or

```
yarn add @luxuryescapes/router
```

```js
const express = require('express')
const s = require('@luxuryescapes/strummer')
const { router } = require('@luxuryescapes/router')

const server = express()

// tags, paths, definitions get added from the route definitions
// everything else is provided here
const swaggerBaseProperties = {
  info: {
    description: 'This is my api',
    version: '1.0.0',
    title: 'My api',
    termsOfService: null,
    contact: {
      email: 'hi@hi.com'
    },
    license: {
      name: 'Apache 2.0',
      url: 'http://www.apache.org/licenses/LICENSE-2.0.html'
    }
  },
  host: 'https://myapi.com',
  basePath: '/',
  tags: [{
    name: 'Another tag'
  }],
  consumes: ['application/json'],
  produces: ['application/json'],
  schemes: [
    'https'
  ],
  paths: {},
  securityDefinitions: {},
  definitions: {},
  preHandlers: [checkValidToken, requireAdmin] // pre handlers are run before your handlers, for example: you could use this to add authentication
}

const routerInstance = router(server, {
  validateResponses: true, // false = responses not validated,true = all responses matching the defined status codes in the schema will be validated and an error throw, DEFAULT: false
  swaggerBaseProperties, // the base properties to include in the swagger definition
  sentryDSN: 'FIND_ME_IN_SENTRY', // optional, provide if you want to auto-report unhandled exceptions to Sentry
  appEnv: process.ENV.APP_ENV, // optional, used to specify the env in Sentry, defaults to "unknown"
  logger: logger, // pass in the luxuryescapes logger and the error handler will use this, resulting in single line log messages in new relic with stack traces.
  sanitizeKeys: [/_token$/, /password/i, "someHideousKey", "path.with.dot"], // array of keys or paths to sanitize from the request body, query and params on error
})

// define routes
routerInstance.put({
  url: '/api/something/:id',
  schema: { // request and response schemas, the endpoint will use these to validate incoming requests and outgoing responses
    request: {
      query: s.objectWithOnly({ hello: s.string(), world: s.string({ min: 2, max: 4 }) }),
      params: s.objectWithOnly({ id: s.integer({ parse: true }) }),
      body: s.objectWithOnly({ action: s.enum({ values: ['create', 'update'], verbose: true }) })
    },
    responses: {
      201: s.objectWithOnly({ id: s.integer() })
    }
  },
  // pre handlers are run before request validation and before your handlers
  // usually used for authentication
  preHandlers: [async (req, res, next) => {
    req.apiToken = getToken()
    next()
  }],
  handlers: [async (req, res) => {
    return res.status(201).json({
      id: parseInt(req.params.id)
    })
  }],
  isPublic: true,
  tags: ['Something'], // for swagger
  summary: 'This route is about something', // for swagger
  deprecated: false, // for swagger; if true, the route will be marked as deprecated
  description: 'This route does something', // for swagger
  validateResponses: false, //  false response body will not be validated against schema, true = response body validated against schema DEFAULT: false
  warnOnRequestValidationError: false, // false = throw error, true = log warning DEFAULT: false
  logRequests: true, // true = request and response will be logged DEFAULT: false,
  correlationIdExtractor: (req, res) => { return req.params.id }, // for use when logRequests is TRUE, this will be used to extract the correlationid from the request/response for use in the log output DEFAULT: null
  logger: new Bunyan(), // you can pass in a logger that will be used for logging output , must have methods `log`, `warn` and `error` DEFAULT: console
  jsonOptions: { limit: '20mb' }, // Options to be passed to express.json() DEFAULT: {}
})

// this is the endpoint that the swagger ui will be served on
routerInstance.serveSwagger('/docs')

// you don't have to use our error handler if you want a custom one
routerInstance.useErrorHandler()
server.listen()
```

# Sentry Support

To automatically send unhandled exceptions to Sentry, two steps are required:

1. Install @sentry/node in to your application using npm or yarn.
2. Pass `sentryDSN` and `appEnv` when building the router (shown above).
3. Use the provided error handler `useErrorHandler`, or create your own that calls Sentry's `handleErrors` function. Make sure to put this after you've defined your routes.

## Writing controllers

All handlers in the route definition are wrapped inside an async handler so there is no need to worry about calling next, or catching exceptions

```js

const controller = async (req, res) => {
  const response = await updateSomeDatabase(req.body)
  res.json({
    status: 200,
    message: null,
    result: response
  })
}

```

If you want to return something that isn't a successful response, you can easily do this by throwing a error

```js
const { errors } = require('@luxuryescapes/router')

const controller = async (req, res) => {
  if (req.params.id === 1) {
    throw new errors.UnprocessableEntityError('1 is not a valid id')
  }
  const response = await updateSomeDatabase(req.body)
  res.json({
    status: 200,
    message: null,
    result: response
  })
}

// this will manifest as
// {
//   "status": 422,
//   "message": "1 is not a valid id",
//   "errors": ["1 is not a valid id]
// }

```

If you want to initialize Sentry for background jobs

```js
const { initializeSentry } = require('@luxuryescapes/router')
import * as Sentry from "@sentry/node";

initializeSentry({
  appEnv: 'staging',
  sentryDSN: 'FIND_ME_IN_SENTRY'
})

try {
  ...
} catch(err) {
  Sentry.captureException(err);
}
```

NOTE: Only a limited amount of http error codes have been mapped so far, if the need for any arise we can easily add them

## Documentation

Use `serveSwagger` to define the endpoint you wish to serve your docs at
This will serve a swagger ui html page, with the swagger definition that is generated from your routes
You can optionally pass middleware via the swagger config `preHandlers` e.g. to secure access to swagger

The raw json is also served
if you defined your docs endpoint as `routerInstance.serveSwagger('/docs')`
You can access the raw json at `/docs/swagger.json`

If you want the raw swagger json definition you can use `toSwagger`

## TypeScript

If you use Strummer schemas to validate your endpoints, you can use the generateTypes CLI command to auto-generate
TypeScript types.

For example if your router was in src/router.ts, and you wanted to output the contract to src/api/contract/server.ts, you would do:

```bash
yarn routerGenerateTypes src/router.ts src/api/contract/server.ts
```

Your router file must export a `mount` function that takes an Express server and returns a RouterAbstraction. In short, it's a function that uses @luxuryescapes/router to set up your endpoints.

### Profit

Now, anytime you run `yarn routerGenerateTypes` the types will be regenerated for you to use in your controllers.

An example of the contract usage is:

```ts
import { Handler } from '@luxuryescapes/router';
import { operations } from '../../contract/server';

export const index: Handler<operations, 'exampleIndex'> = (req, res) => {
  res.json({ hello: 'world' });
};
```

## Upgrade Guides

### Upgrading from v1 to v2

Where you instantiate your router, remove the `swagger` property:

```
swaggerBaseProperties: {
  swagger: "2.0",
  info: { ... }
  ...
```

to

```
swaggerBaseProperties: {
  info: { ... }
  ...
```

### Upgrading to v1

The use of [Node's crypto module](https://nodejs.org/api/crypto.html) means that versions below v15.6.0 and v14.17.0 are no longer supported. Upgrade your Node version to an appropriate version.

## Contributing

Make your change, make a PR

* `yarn test`
