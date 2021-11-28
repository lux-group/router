const { expect } = require('chai')
const s = require('strummer')
const OpenAPISchemaValidator = require('openapi-schema-validator').default

const generateSwagger = require('../lib/generate-swagger')

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
  it('creates definitions for one of', () => {
    const response = s.object({ x: s.oneOf([hotelSchema, tourSchema]) })
    const swagger = generateSwagger(buildRouteDefinitions({ response }), baseProperties)

    expect(
      swagger.paths['/']['get']['responses']['200']['content']['application/json']['schema']['properties']
    ).to.eql({
      x: {
        oneOf: [
          { $ref: '#/components/schemas/hotel' },
          { $ref: '#/components/schemas/tour' }
        ],
        type: 'object'
      }
    })

    expect(swagger.components.schemas).to.eql({
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

    expect(swagger.components.schemas).to.eql({
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

    expect(swagger.paths['/']['get']['responses']['200']['content']['application/json']).to.eql({
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

    expect(swagger.components.schemas).to.eql({
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

    expect(swagger.paths['/']['get']['responses']['200']['content']['application/json']).to.eql({
      'schema': { '$ref': '#/definitions/rate' }
    })
  })

  it('generates integer parameters', () => {
    const swagger = generateSwagger(
      buildRouteDefinitions({ query: s.object({ page: s.integer() }) }),
      baseProperties
    )

    expect(swagger.paths['/']['get'].parameters[0]).to.eql({
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

    expect(swagger.paths['/']['get'].parameters[0]).to.eql({
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

    expect(swagger.paths['/']['get'].parameters[0]).to.eql({
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

    expect(swagger.paths['/']['get'].parameters[0]).to.eql({
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

  it('handles descriptions', () => {
    const swagger = generateSwagger(
      buildRouteDefinitions({
        params: s.object({
          id: s.uuid({ description: 'The ID to lookup' })
        })
      }),
      baseProperties
    )

    expect(swagger.paths['/']['get'].parameters[0]).to.eql({
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
    expect(result.errors).to.deep.equal([])
  })
})
