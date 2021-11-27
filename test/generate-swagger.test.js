const { expect } = require('chai')
const s = require('strummer')
const generateSwagger = require('../lib/generate-swagger')

const schemaA = s(
  'A',
  s.object({
    id: s.uuid()
  })
)

describe('generateSwagger', () => {
  it('creates definitions for partially named one ofs', () => {
    const schemaB = s.object({
      id: s.uuid()
    })

    const schema = s.object({ x: s.oneOf([schemaA, schemaB]) })

    const swagger = generateSwagger(
      {
        get: { '/': { schema: { request: {}, responses: { 200: schema } } } }
      },
      {}
    )

    expect(swagger.components.schemas).to.eql({
      A: {
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

    expect(
      swagger.paths['/']['get']['responses']['200']['content']['application/json']['schema']['properties']
    ).to.eql({
      x: {
        oneOf: [
          {
            $ref: '#/components/schemas/A'
          },
          {
            properties: {
              id: {
                format: 'uuid',
                type: 'string'
              }
            },
            required: ['id'],
            type: 'object'
          }
        ],
        type: 'object'
      }
    })
  })

  it('creates definitions for one of', () => {
    const schemaB = s(
      'B',
      s.object({
        id: s.uuid()
      })
    )

    const schema = s.object({ x: s.oneOf([schemaA, schemaB]) })

    const swagger = generateSwagger(
      {
        get: { '/': { schema: { request: {}, responses: { 200: schema } } } }
      },
      {}
    )

    expect(
      swagger.paths['/']['get']['responses']['200']['content']['application/json']['schema']['properties']
    ).to.eql({
      x: {
        oneOf: [
          {
            $ref: '#/components/schemas/A'
          },
          {
            $ref: '#/components/schemas/B'
          }
        ],
        type: 'object'
      }
    })

    expect(swagger.components.schemas).to.eql({
      A: {
        properties: {
          id: {
            format: 'uuid',
            type: 'string'
          }
        },
        required: ['id'],
        type: 'object'
      },
      B: {
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
    const rateSchema = s('rate', s.object({
      id: s.uuid()
    }))

    const packageSchema = s(
      'package',
      s.object({ id: s.uuid(), rates: s.array({ of: rateSchema }) })
    )

    const okResponseSchema = s.object({
      id: s.number(),
      packages: s.array({ of: packageSchema })
    })

    const swagger = generateSwagger(
      {
        get: {
          '/': {
            schema: { request: {}, responses: { 200: okResponseSchema } }
          }
        }
      },
      {}
    )

    expect(swagger.components.schemas).to.eql({
      package: {
        properties: {
          id: {
            format: 'uuid',
            type: 'string'
          },
          rates: {
            items: {
              $ref: '#/components/schemas/rate'
            },
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
      description: '200 response',
      schema: {
        properties: {
          id: {
            type: 'number'
          },
          packages: {
            items: {
              $ref: '#/components/schemas/package'
            },
            type: 'array'
          }
        },
        required: ['id', 'packages'],
        type: 'object'
      }
    })
  })

  it('creates definitions for deep options', () => {
    const rateSchema = s('rate', s.object({
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
      {
        get: {
          '/': {
            schema: { request: {}, responses: { 200: rateSchema } }
          }
        }
      },
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
      'schema': {
        '$ref': '#/definitions/rate'
      },
    })
  })

  it('generates parameters', () => {
    const swagger = generateSwagger(
      {
        get: {
          '/': {
            schema: {
              request: {
                query: s.object({
                  page: s.integer()
                })
              },
              responses: {}
            }
          }
        }
      },
      {}
    ) 
    expect(swagger.paths['/']['get'].parameters[0]).to.eql({
      "in": "query",
      "name": "page",
      "required": true,
      "schema": { "type": "integer" }
    })
  })
})
