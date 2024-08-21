const s = require('@luxuryescapes/strummer')
const OpenAPISchemaValidator = require('openapi-schema-validator').default

const generateSwagger = require('../lib/generate-swagger')

const unnamedSchema = s.object({
  id: s.uuid()
})

const rateSchema = s('rate', s.object({
  id: s.uuid()
}))

const hotelSchema = s('hotel', s.object({
  id: s.uuid()
}))

const tourSchema = s('tour', s.object({
  id: s.uuid()
}))

const packageSchema = s(
  'package',
  s.object({ id: s.uuid(), rates: s.array({ of: rateSchema }) })
)

const buildRouteDefinitions = ({ query, params, response }) =>
  ({
    get: {
      '/': {
        schema: {
          request: { query, params },
          responses: response ? { 200: response } : {}
        }
      }
    }
  })

const baseProperties = { info: { title: 'TEST API', version: 'x' } }

describe('generateSwagger', () => {
  it('creates definitions for hashmap', () => {
    const response = s.object({
      packages: s.hashmap(packageSchema)
    })
    const swagger = generateSwagger(buildRouteDefinitions({ response }), baseProperties)

    expect(swagger.paths['/']['get']['responses']['200']['content']['application/json']['schema']).toEqual({
      properties: {
        packages: {
          additionalProperties: { $ref: '#/components/schemas/package' },
          type: 'object'
        }
      },
      required: [
        'packages'
      ],
      type: 'object'
    })

    expect(swagger.components.schemas).toEqual({
      package: {
        properties: {
          id: {
            format: 'uuid',
            type: 'string'
          },
          rates: {
            items: { $ref: '#/components/schemas/rate' },
            type: 'array'
          }
        },
        required: ['id', 'rates'],
        type: 'object'
      },
      rate: {
        properties: {
          id: {
            format: 'uuid',
            type: 'string'
          }
        },
        required: ['id'],
        type: 'object'
      }
    })

    expect(swagger.components.securitySchemes).toEqual(
      {
        bearerAuth: {
          type: 'http',
          name: 'Authorization',
          in: 'header',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        cookieBased: {
          type: 'apiKey',
          name: 'Cookie',
          in: 'header',
          description: 'Cookie'
        }
      }
    )

    expect(swagger.security).toEqual([{
      bearerAuth: []
    }, { cookieBased: [] }])
  })

  it('should prefer customized security definitions if one is provided', () => {
    const response = s.object({
      packages: s.hashmap(packageSchema)
    })
    const updatedBaseProperties = {
      ...baseProperties,
      securityDefinitions: {
        type: 'custom-type'
      },
      security: [{ somekey: 'some-security' }]
    }
    const swagger = generateSwagger(buildRouteDefinitions({ response }), updatedBaseProperties)

    expect(swagger.paths['/']['get']['responses']['200']['content']['application/json']['schema']).toEqual({
      properties: {
        packages: {
          additionalProperties: { $ref: '#/components/schemas/package' },
          type: 'object'
        }
      },
      required: [
        'packages'
      ],
      type: 'object'
    })

    expect(swagger.components.schemas).toEqual({
      package: {
        properties: {
          id: {
            format: 'uuid',
            type: 'string'
          },
          rates: {
            items: { $ref: '#/components/schemas/rate' },
            type: 'array'
          }
        },
        required: ['id', 'rates'],
        type: 'object'
      },
      rate: {
        properties: {
          id: {
            format: 'uuid',
            type: 'string'
          }
        },
        required: ['id'],
        type: 'object'
      }
    })

    expect(swagger.components.securitySchemes).toEqual({
      type: 'custom-type'
    })

    expect(swagger.security).toEqual([{ somekey: 'some-security' }])
  })

  it('does not create definitions for unnamed hashmaps', () => {
    const response = s.objectWithOnly({
      packages: s.hashmap(unnamedSchema)
    })

    const swagger = generateSwagger(buildRouteDefinitions({ response }), baseProperties)

    expect(swagger.paths['/']['get']['responses']['200']['content']['application/json']['schema']).toEqual({
      additionalProperties: false,
      properties: {
        packages: {
          additionalProperties: {
            properties: {
              id: {
                format: 'uuid',
                type: 'string'
              }
            },
            required: ['id'],
            type: 'object'
          },
          type: 'object'
        }
      },
      required: [
        'packages'
      ],
      type: 'object'
    })

    expect(swagger.components.schemas).toEqual({})
  })

  it('creates definitions for one of', () => {
    const response = s.object({ x: s.oneOf([hotelSchema, tourSchema]) })
    const swagger = generateSwagger(buildRouteDefinitions({ response }), baseProperties)

    expect(
      swagger.paths['/']['get']['responses']['200']['content']['application/json']['schema']['properties']
    ).toEqual({
      x: {
        oneOf: [
          { $ref: '#/components/schemas/hotel' },
          { $ref: '#/components/schemas/tour' }
        ],
        type: 'object'
      }
    })

    expect(swagger.components.schemas).toEqual({
      hotel: {
        properties: {
          id: {
            format: 'uuid',
            type: 'string'
          }
        },
        required: ['id'],
        type: 'object'
      },
      tour: {
        properties: {
          id: {
            format: 'uuid',
            type: 'string'
          }
        },
        required: ['id'],
        type: 'object'
      }
    })
  })

  it('creates definitions for arrays of arrays', () => {
    const response = s.object({
      id: s.number(),
      packages: s.array({ of: packageSchema })
    })
    const swagger = generateSwagger(buildRouteDefinitions({ response }), baseProperties)

    expect(swagger.components.schemas).toEqual({
      package: {
        properties: {
          id: {
            format: 'uuid',
            type: 'string'
          },
          rates: {
            items: { $ref: '#/components/schemas/rate' },
            type: 'array'
          }
        },
        required: ['id', 'rates'],
        type: 'object'
      },
      rate: {
        properties: {
          id: {
            format: 'uuid',
            type: 'string'
          }
        },
        required: ['id'],
        type: 'object'
      }
    })

    expect(swagger.paths['/']['get']['responses']['200']['content']['application/json']).toEqual({
      schema: {
        properties: {
          id: {
            type: 'number'
          },
          packages: {
            items: { $ref: '#/components/schemas/package' },
            type: 'array'
          }
        },
        required: ['id', 'packages'],
        type: 'object'
      }
    })
  })

  it('creates definitions for deep options', () => {
    const response = s('rate', s.object({
      id: s.uuid(),
      opt: s.optional(
        s.oneOf([
          s.enum({ values: ['hotel_only', 'hotel_package'], type: 'string' }),
          s.array({
            of: s.enum({
              values: ['hotel_only', 'hotel_package'],
              type: 'string'
            })
          })
        ])
      ),
      req: s.oneOf([
        s.enum({ values: ['hotel_only', 'hotel_package'], type: 'string' }),
        s.array({
          of: s.enum({
            values: ['hotel_only', 'hotel_package'],
            type: 'string'
          })
        })
      ])
    }))

    const swagger = generateSwagger(
      buildRouteDefinitions({ response }),
      {}
    )

    expect(swagger.components.schemas).toEqual({
      'rate': {
        'type': 'object',
        'properties': {
          'id': {
            'type': 'string',
            'format': 'uuid'
          },
          'opt': {
            'oneOf': [
              {
                'enum': [
                  'hotel_only',
                  'hotel_package'
                ],
                'type': 'string'
              },
              {
                'type': 'array',
                'items': {
                  'enum': [
                    'hotel_only',
                    'hotel_package'
                  ],
                  'type': 'string'
                }
              }
            ]
          },
          'req': {
            'oneOf': [
              {
                'enum': [
                  'hotel_only',
                  'hotel_package'
                ],
                'type': 'string'
              },
              {
                'type': 'array',
                'items': {
                  'enum': [
                    'hotel_only',
                    'hotel_package'
                  ],
                  'type': 'string'
                }
              }
            ]
          }
        },
        'required': [
          'id',
          'req'
        ]
      }
    })

    expect(swagger.paths['/']['get']['responses']['200']['content']['application/json']).toEqual({
      'schema': { '$ref': '#/definitions/rate' }
    })
  })

  it('generates integer parameters', () => {
    const swagger = generateSwagger(
      buildRouteDefinitions({ query: s.object({ page: s.integer() }) }),
      baseProperties
    )

    expect(swagger.paths['/']['get'].parameters[0]).toEqual({
      'in': 'query',
      'name': 'page',
      'required': true,
      'schema': { 'type': 'integer' }
    })
  })

  it('generates enum parameters', () => {
    const swagger = generateSwagger(
      buildRouteDefinitions({
        query: s.object({
          region: s.enum({ values: ['AU', 'NZ'] })
        })
      }),
      baseProperties
    )

    expect(swagger.paths['/']['get'].parameters[0]).toEqual({
      'in': 'query',
      'name': 'region',
      'required': true,
      'schema': { 'enum': ['AU', 'NZ'] }
    })
  })

  it('generates array parameters', () => {
    const swagger = generateSwagger(
      buildRouteDefinitions({
        query: s.object({
          ids: s.array({ of: s.string() })
        })
      }),
      baseProperties
    )

    expect(swagger.paths['/']['get'].parameters[0]).toEqual({
      'in': 'query',
      'name': 'ids',
      'required': true,
      'schema': {
        'type': 'array',
        'items': { 'type': 'string' }
      }
    })
  })

  it('generates formatted parameters', () => {
    const swagger = generateSwagger(
      buildRouteDefinitions({
        query: s.object({
          ids: s.array({ of: s.uuid() })
        })
      }),
      baseProperties
    )

    expect(swagger.paths['/']['get'].parameters[0]).toEqual({
      'in': 'query',
      'name': 'ids',
      'required': true,
      'schema': {
        'type': 'array',
        'items': {
          'format': 'uuid',
          'type': 'string'
        }
      }
    })
  })

  it('generates component schemas for query params', () => {
    const swagger = generateSwagger(
      buildRouteDefinitions({
        query: s.object({
          region: s('region', s.enum({ values: ['AU', 'NZ'] }))
        })
      }),
      baseProperties
    )

    expect(swagger.components.schemas).toEqual({
      'region': {
        'enum': [
          'AU',
          'NZ'
        ]
      }
    })

    expect(swagger.paths['/'].get.parameters[0]).toEqual({
      'in': 'query',
      'name': 'region',
      'required': true,
      'schema': {
        '$ref': '#/components/schemas/region'
      }
    })
  })

  it('handles descriptions', () => {
    const swagger = generateSwagger(
      buildRouteDefinitions({
        params: s.object({
          id: s.uuid({ description: 'The ID to lookup' })
        })
      }),
      baseProperties
    )

    expect(swagger.paths['/']['get'].parameters[0]).toEqual({
      'in': 'path',
      'name': 'id',
      'required': true,
      'description': 'The ID to lookup',
      'schema': {
        'format': 'uuid',
        'type': 'string'
      }
    })
  })

  it('generates a valid openapi', async () => {
    const query = s.object({
      page: s.integer(),
      region: s.enum({ values: ['AU', 'NZ'] })
    })

    const response = s.object({
      id: s.number(),
      packages: s.array({ of: packageSchema })
    })

    const swagger = generateSwagger(buildRouteDefinitions({ query, response }), baseProperties)

    var validator = new OpenAPISchemaValidator({
      version: '3.0.3'
    })
    const result = validator.validate(swagger)
    expect(result.errors).toEqual([])
  })
})
