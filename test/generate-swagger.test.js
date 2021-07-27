const { expect } = require('chai')
const s = require('strummer')
const generateSwagger = require('../lib/generate-swagger')

describe('generateSwagger', () => {
  it('creates definitions for arrays of arrays', () => {
    const rateSchema = s('rate', s.object({
      id: s.uuid()
    }))

    const packageSchema = s('package', s.object({ id: s.uuid(), rates: s.array({ of: rateSchema }) }))

    const okResponseSchema = s.object({
      id: s.number(),
      packages: s.array({ of: packageSchema })
    })

    const swagger = generateSwagger({
      get: { '/': { schema: { request: {}, responses: { 200: okResponseSchema } } } }
    }, {})

    expect(swagger.definitions).to.eql({
      'package': {
        'properties': {
          'id': {
            'format': 'uuid',
            'type': 'string'
          },
          'rates': {
            'items': {
              '$ref': '#/definitions/rate'
            },
            'type': 'array'
          }
        },
        'required': [
          'id',
          'rates'
        ],
        'type': 'object'
      },
      'rate': {
        'properties': {
          'id': {
            'format': 'uuid',
            'type': 'string'
          }
        },
        'required': [
          'id'
        ],
        'type': 'object'
      }
    })

    expect(swagger.paths['/']['get']['responses']['200']).to.eql({
      'description': '200 response',
      'schema': {
        'properties': {
          'id': {
            'type': 'number'
          },
          'packages': {
            'items': {
              '$ref': '#/definitions/package'
            },
            'type': 'array'
          }
        },
        'required': [
          'id',
          'packages'
        ],
        'type': 'object'
      }
    })
  })
})
