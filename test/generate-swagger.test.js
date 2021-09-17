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

    expect(swagger.definitions).to.eql({
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
      swagger.paths['/']['get']['responses']['200']['schema']['properties']
    ).to.eql({
      x: {
        oneOf: [
          {
            $ref: '#/definitions/A'
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
      swagger.paths['/']['get']['responses']['200']['schema']['properties']
    ).to.eql({
      x: {
        oneOf: [
          {
            $ref: '#/definitions/A'
          },
          {
            $ref: '#/definitions/B'
          }
        ],
        type: 'object'
      }
    })

    expect(swagger.definitions).to.eql({
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

    expect(swagger.definitions).to.eql({
      package: {
        properties: {
          id: {
            format: 'uuid',
            type: 'string'
          },
          rates: {
            items: {
              $ref: '#/definitions/rate'
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

    expect(swagger.paths['/']['get']['responses']['200']).to.eql({
      description: '200 response',
      schema: {
        properties: {
          id: {
            type: 'number'
          },
          packages: {
            items: {
              $ref: '#/definitions/package'
            },
            type: 'array'
          }
        },
        required: ['id', 'packages'],
        type: 'object'
      }
    })
  })
})
