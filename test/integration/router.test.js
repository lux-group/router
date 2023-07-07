const express = require('express')
const s = require('@luxuryescapes/strummer')
const request = require('supertest')
const createErrorHandler = require('../../lib/middleware/error-handler')

const { router, errors } = require('../../index')
const uuid = require('../../lib/utils/uuid')

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
  tags: [
    {
      name: 'Another tag'
    }
  ],
  consumes: ['application/json'],
  produces: ['application/json'],
  schemes: ['https'],
  paths: {},
  securityDefinitions: {},
  components: { schemas: {} }
}

const schema = {
  request: {
    query: s.objectWithOnly({
      hello: s.enum({
        type: 'string',
        values: ['hi', 'hello'],
        verbose: true,
        description: 'Different ways to greet someone'
      }),
      world: s.string({ min: 2, max: 4 }),
      foo: s.array({ of: s.string(), optional: true })
    }),
    params: s.objectWithOnly({
      id: s.integer({ parse: true })
    }),
    body: s.objectWithOnly({
      action: s.enum({
        values: ['create', 'update'],
        verbose: true,
        description: 'The action you want to perform'
      })
    })
  },
  responses: {
    201: s.objectWithOnly({
      id: s.integer(),
      item: s.optional(
        s.oneOf([
          s('itemA', s.objectWithOnly({ id: s.integer() })),
          s('itemB', s.objectWithOnly({ id: s.integer() }))
        ])
      )
    })
  }
}

describe('router', () => {
  let app
  let server
  let routerInstance

  beforeEach(async () => {
    server = express()
    server.use(express.text())
  })

  afterEach(async () => {
    return new Promise((resolve) => app.close(resolve))
  })

  const genericHandler = async (req, res) => {
    return res.status(201).json({
      id: parseInt(req.params.id)
    })
  }

  const echoHandler = (req, res) => {
    res.status(200).json({ body: req.body })
  }

  const setupRoutes = ({ handler, opts, routeOpts = {} } = {}) => {
    routerInstance = router(server, {
      validateResponses: true,
      swaggerBaseProperties,
      ...opts
    })
    routerInstance.put({
      url: '/api/something/:id',
      schema,
      handlers: [handler || genericHandler],
      isPublic: true,
      tags: ['Something'],
      summary: 'This route is about something',
      description: 'This route does something',
      ...routeOpts
    })
    routerInstance.post({
      url: '/api/echo',
      handlers: [echoHandler]
    })
    routerInstance.serveSwagger('/docs')
    const errorHandler = createErrorHandler(opts)
    server.use(errorHandler)
    return new Promise((resolve) => {
      app = server.listen(resolve)
    })
  }

  describe('preHandlers', () => {
    beforeEach(async () => {
      return setupRoutes({
        handler: async (req, res) => {
          return res.status(201).json({
            id: req.userToken
          })
        },
        opts: { validateResponses: false, swaggerBaseProperties },
        routeOpts: {
          preHandlers: [
            (req, res, next) => {
              req.userToken = 'abc'
              next()
            }
          ]
        }
      })
    })

    it('pre handlers come first', async () => {
      const response = await request(app)
        .put('/api/something/123')
        .query({ hello: 'hi', world: 'yes' })
        .send({
          action: 'create'
        })

      expect(response.status).toEqual(201)
      expect(response.body).toEqual({ id: 'abc' })
    })
  })

  describe('non json requests', () => {
    beforeEach(() => setupRoutes())
    it('returns a successful response', async () => {
      const response = await request(app)
        .post('/api/echo')
        .set('content-type', 'text/plain')
        .send('ABC')
      expect(response.status).toEqual(200)
      expect(response.body).toEqual({ body: 'ABC' })
    })
  })

  describe('request logging', () => {
    describe('when disabled', () => {
      let logger
      beforeEach(async () => {
        logger = { info: jest.fn(), warn: jest.fn() }
        return setupRoutes({ opts: { logRequests: false, logger } })
      })

      it('should not log', async () => {
        const response = await request(app)
          .put('/api/something/123')
          .query({ hello: 'hi', world: 'yes' })
          .send({
            action: 'create'
          })

        expect(response.status).toEqual(201)
        expect(logger.info).not.toHaveBeenCalled()
      })
    })

    describe('when enabled', () => {
      let logger
      beforeEach(async () => {
        logger = { info: jest.fn(), warn: jest.fn() }
        jest.spyOn(uuid, 'get').mockReturnValue('stubbeduuid')
        return setupRoutes({ opts: { logRequests: true, logger } })
      })

      it('should log', async () => {
        const response = await request(app)
          .put('/api/something/123')
          .query({ hello: 'hi', world: 'yes' })
          .send({
            action: 'create'
          })

        expect(response.status).toEqual(201)
        expect(logger.info.mock.calls).toMatchInlineSnapshot(`
          Array [
            Array [
              "request: (stubbeduuid) PUT /api/something/123?hello=hi&world=yes {\\"action\\":\\"create\\"}",
            ],
            Array [
              "response: (stubbeduuid) 201: {\\"id\\":123}",
            ],
          ]
        `)
      })
    })

    describe('when using correlationIdExtractor', () => {
      let logger
      beforeEach(async () => {
        logger = { info: jest.fn(), warn: jest.fn() }
        return setupRoutes({
          opts: {
            logRequests: true,
            logger,
            correlationIdExtractor: (req, res) => req.params.id
          }
        })
      })

      it('should log with specified correlation id', async () => {
        const response = await request(app)
          .put('/api/something/123')
          .query({ hello: 'hi', world: 'yes' })
          .send({
            action: 'create'
          })

        expect(response.status).toEqual(201)
        expect(logger.info.mock.calls).toMatchInlineSnapshot(`
          Array [
            Array [
              "request: (123) PUT /api/something/123?hello=hi&world=yes {\\"action\\":\\"create\\"}",
            ],
            Array [
              "response: (123) 201: {\\"id\\":123}",
            ],
          ]
        `)
      })
    })
  })

  describe('request validation', () => {
    describe('when enabled', () => {
      beforeEach(async () => {
        return setupRoutes()
      })

      it('should return if request is valid', async () => {
        const response = await request(app)
          .put('/api/something/123')
          .query({ hello: 'hi', world: 'yes' })
          .send({
            action: 'create'
          })

        expect(response.status).toEqual(201)
        expect(response.body).toEqual({ id: 123 })
      })

      it('should error if query params are invalid', async () => {
        const response = await request(app)
          .put('/api/something/123')
          .query({ world: 'yes' })
          .send({
            action: 'create'
          })

        expect(response.status).toEqual(400)
        expect(response.body).toEqual({
          status: 400,
          message: 'Invalid url query parameters',
          stack: expect.any(String),
          errors: [
            {
              path: 'hello',
              message: 'should be a valid enum value (hi,hello)'
            }
          ]
        })
        expect(response.body.stack).toMatch(`Error: Invalid url query parameters
    at new InvalidRequestError`);
      })

      it('should error if params are invalid', async () => {
        const response = await request(app)
          .put('/api/something/myid123')
          .query({ hello: 'hi', world: 'yes' })
          .send({
            action: 'create'
          })

        expect(response.status).toEqual(400)
        expect(response.body).toEqual(expect.objectContaining({
          status: 400,
          message: 'Invalid url path parameters',
          stack: expect.any(String),
          errors: [
            {
              path: 'id',
              message: 'should be an integer',
              value: 'myid123'
            }
          ]
        }))
        expect(response.body.stack).toMatch(`Error: Invalid url path parameters
    at new InvalidRequestError`);
      })

      it('should error if payload is invalid', async () => {
        const response = await request(app)
          .put('/api/something/123')
          .query({ hello: 'hi', world: 'yes' })
          .send({
            action: 'delete'
          })

        expect(response.status).toEqual(400)
        expect(response.body).toEqual(expect.objectContaining({
          status: 400,
          message: 'Invalid payload',
          stack: expect.any(String),
          errors: [
            {
              path: 'action',
              message: 'should be a valid enum value (create,update)',
              value: 'delete'
            }
          ]
        }))
        expect(response.body.stack).toMatch(`Error: Invalid payload
    at new InvalidRequestError`);
      })
    })

    describe('when on warn mode', () => {
      beforeEach(async () => {
        return setupRoutes({
          routeOpts: { warnOnRequestValidationError: true }
        })
      })

      it('should not error if query params are invalid', async () => {
        const response = await request(app)
          .put('/api/something/123')
          .query({ world: 'yes' })
          .send({
            action: 'create'
          })

        expect(response.status).toEqual(201)
        expect(response.body).toEqual({ id: 123 })
      })
    })

    describe('when an operationId is given', () => {
      beforeEach(() =>
        setupRoutes({ routeOpts: { operationId: 'updateSomething' } })
      )

      it('sets the operationId', () => {
        expect(
          routerInstance.toSwagger().paths['/api/something/{id}']['put']['operationId']
        ).toEqual('updateSomething')
      })
    })

    describe('when an operationId is not given', () => {
      beforeEach(() => setupRoutes())

      it('generates an operationId', () => {
        expect(
          routerInstance.toSwagger().paths['/api/something/{id}']['put']['operationId']
        ).toEqual('/api/something/{id}/put')
      })
    })
  })

  describe('response validation', () => {
    describe('when enabled', () => {
      beforeEach(async () => {
        return setupRoutes({
          handler: async (req, res) => {
            if (req.params.id === '456') {
              return res.status(201).json({
                id: parseInt(req.params.id),
                extraField: 'shouldnotbehere'
              })
            }
            if (req.params.id === '789') {
              return res.status(200).json({
                id: parseInt(req.params.id),
                thiswonterror: 'cos it is not validated'
              })
            }
            return res.status(201).json({
              id: parseInt(req.params.id)
            })
          }
        })
      })

      it('should error if response structure is incorrect', async () => {
        const response = await request(app)
          .put('/api/something/456')
          .query({ hello: 'hi', world: 'yes' })
          .send({
            action: 'create'
          })

        expect(response.status).toEqual(500)
        expect(response.body).toEqual({
          status: 500,
          message: 'Response body does not match the specified schema',
          stack: expect.any(String),
          errors: [
            {
              path: 'extraField',
              message: 'should not exist',
              value: 'shouldnotbehere'
            }
          ]
        })
      })

      it('should return if status code not mapped', async () => {
        const response = await request(app)
          .put('/api/something/789')
          .query({ hello: 'hi', world: 'yes' })
          .send({
            action: 'create'
          })

        expect(response.status).toEqual(200)
        expect(response.body).toEqual({
          id: 789,
          thiswonterror: 'cos it is not validated'
        })
      })
      it('should return if response structure is valid', async () => {
        const response = await request(app)
          .put('/api/something/123')
          .query({ hello: 'hi', world: 'yes' })
          .send({
            action: 'create'
          })

        expect(response.status).toEqual(201)
        expect(response.body).toEqual({
          id: 123
        })
      })
    })
    describe('when disabled', () => {
      beforeEach(async () => {
        return setupRoutes({
          handler: async (req, res) => {
            return res.status(201).json({
              id: parseInt(req.params.id),
              extraField: 'shouldnotbehere'
            })
          },
          opts: { validateResponses: false, swaggerBaseProperties }
        })
      })

      it('should return because it is not validated', async () => {
        const response = await request(app)
          .put('/api/something/123')
          .query({ hello: 'hi', world: 'yes' })
          .send({
            action: 'create'
          })

        expect(response.status).toEqual(201)
        expect(response.body).toEqual({
          id: 123,
          extraField: 'shouldnotbehere'
        })
      })
    })
  })

  describe('toSwagger', () => {
    beforeEach(setupRoutes)

    it('should generate swagger', () => {
      expect(routerInstance.toSwagger()).toMatchSnapshot()
    })

    it('includes the components', () => {
      const swagger = routerInstance.toSwagger()
      expect(Object.keys(swagger.components.schemas)).toEqual(['itemA', 'itemB'])
    })
  })

  describe('serveSwagger', () => {
    beforeEach(async () => {
      return setupRoutes()
    })

    it('should serve swagger ui with swagger definition', async () => {
      const response = await request(app).get('/docs/')
      expect(response.text).toMatch(/Swagger UI/)
    })
  })

  describe('errorHandler', () => {
    beforeEach(async () => {
      return setupRoutes({
        handler: async (req, res) => {
          if (req.params.id === '456') {
            throw new errors.UnprocessableEntityError('Unprocessable yo', [
              {
                path: 'something',
                message: 'hahahehe'
              }
            ])
          }
          if (req.params.id === '789') {
            throw new Error('Unknown error', [])
          }
          return res.status(201).json({
            id: parseInt(req.params.id)
          })
        }
      })
    })

    it('should handle known errors that are thrown', async () => {
      const response = await request(app)
        .put('/api/something/456')
        .query({ hello: 'hi', world: 'yes' })
        .send({
          action: 'create'
        })

      expect(response.status).toEqual(422)
      expect(response.body).toEqual(expect.objectContaining({
        status: 422,
        message: 'Unprocessable yo',
        stack: expect.any(String),
        errors: [
          {
            path: 'something',
            message: 'hahahehe'
          }
        ]
      }))
      expect(response.body.stack).toMatch(`Error: Unprocessable yo
    at new UnprocessableEntityError`);
    })

    it('should coerce unknown errors to a 500', async () => {
      const response = await request(app)
        .put('/api/something/789')
        .query({ hello: 'hi', world: 'yes' })
        .send({
          action: 'create'
        })

      expect(response.status).toEqual(500)
      expect(response.body).toEqual(expect.objectContaining({
        status: 500,
        message: 'Unknown error',
        errors: ['Unknown error']
      }));

      expect(response.body.stack).toMatch(`Error: Unknown error
    at new ServerError`);

    
    })
  })
})
