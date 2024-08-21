const omit = require('lodash.omit')

const jsonSchemaToParameters = (schema, { into }) => {
  if (!schema.properties) {
    return []
  }
  return Object.keys(schema.properties).map((property) => {
    const schemaProperty = schema.properties[property]
    let result = {
      name: property,
      in: into,
      required: schema.required ? schema.required.includes(property) : false,
      schema: omit(schemaProperty, ['description'])
    }
    if (schemaProperty.description) {
      result.description = schemaProperty.description
    }
    return result
  })
}

const addDefinitionsRecursively = (schema, definitions) => {
  if (schema.name) {
    let name = schema.name
    addDefinitions(definitions, schema.name, schema)
    schema = {
      $ref: `#/components/schemas/${name}`
    }
  } else {
    findNestedDefinition(schema, definitions)
  }
}

const generateParams = (schema) => {
  if (!schema || !schema.params) return []

  return jsonSchemaToParameters(schema.params.toJSONSchema(), { into: 'path' })
}

const generateQueryParams = (schema, definitions) => {
  if (!schema || !schema.query) return []

  const jsonSchema = schema.query.toJSONSchema()
  addDefinitionsRecursively(jsonSchema, definitions)

  return jsonSchemaToParameters(jsonSchema, { into: 'query' })
}

const generatePayload = (schema, definitions) => {
  if (!schema || !schema.body) return []

  let jsonSchema = schema.body.toJSONSchema()
  addDefinitionsRecursively(jsonSchema, definitions)

  return [{
    name: schema.body.name ? schema.body.name : 'payload',
    in: 'body',
    required: true,
    schema: jsonSchema
  }]
}

const generateSecuritySchemes = () => ({
  bearerAuth: {
    type: 'http',
    name: 'Authorization',
    in: 'header',
    scheme: 'bearer',
    bearerFormat: 'JWT'
  },
  cookieBased: {
    type: 'http',
    name: 'Cookie',
    in: 'header',
    description: 'Cookie',
    scheme: 'token'
  }
})

const findNestedDefinition = (jsonSchema, definitions) => {
  if (jsonSchema.items && jsonSchema.items.name) {
    let name = jsonSchema.items.name
    addDefinitions(definitions, name, jsonSchema.items)
    jsonSchema.items = {
      $ref: `#/components/schemas/${name}`
    }
  } else if (jsonSchema.items) {
    findNestedDefinition(jsonSchema.items, definitions)
  } else if (jsonSchema.oneOf) {
    jsonSchema.oneOf = jsonSchema.oneOf.map(s => {
      const { name } = s
      if (!name) return s

      addDefinitions(definitions, name, s)
      return {
        $ref: `#/components/schemas/${name}`
      }
    })
  } else if (!jsonSchema.properties && jsonSchema.additionalProperties && jsonSchema.additionalProperties.name) {
    const { name } = jsonSchema.additionalProperties
    addDefinitions(definitions, name, jsonSchema.additionalProperties)
    jsonSchema.additionalProperties = { $ref: `#/components/schemas/${name}` }
  } else {
    for (let key in jsonSchema.properties) {
      let property = jsonSchema.properties[key]
      if (property.name) {
        let name = property.name
        addDefinitions(definitions, property.name, property)
        jsonSchema.properties[key] = {
          $ref: `#/components/schemas/${name}`
        }
      } else if (property.items && property.items.name) {
        let name = property.items.name
        addDefinitions(definitions, name, property.items)
        property.items = {
          $ref: `#/components/schemas/${name}`
        }
      } else {
        findNestedDefinition(property, definitions)
      }
    }
  }
}

const addDefinitions = (definitions, name, jsonSchema) => {
  if (!definitions[name]) {
    findNestedDefinition(jsonSchema, definitions)
    definitions[name] = omit(jsonSchema, ['name'])
  }
}

const generateResponseDefinitions = (schema, definitions) => {
  if (!schema) {
    return {}
  }

  const responses = {}

  for (let responseCode of Object.keys(schema)) {
    const name = schema[responseCode].name
    const jsonSchema = schema[responseCode].toJSONSchema()
    if (name) {
      addDefinitions(definitions, name, jsonSchema)
      responses[responseCode] = {
        content: {
          'application/json': {
            schema: {
              $ref: `#/definitions/${name}`
            }
          }
        },
        description: `${responseCode} response`
      }
    } else {
      findNestedDefinition(jsonSchema, definitions)
      responses[responseCode] = {
        content: {
          'application/json': {
            schema: jsonSchema
          }
        },
        description: `${responseCode} response`
      }
    }
  }

  return responses
}

const generateRoutes = (routeDefinitions, existingTags) => {
  let definitions = {}
  let tags = {}
  let paths = {}

  const existingTagsByName = existingTags.reduce((acc, tag) => {
    if (tag.name) {
      acc[tag.name] = true
    }
    return acc
  }, {})

  for (let method of Object.keys(routeDefinitions)) {
    for (let path of Object.keys(routeDefinitions[method])) {
      const swaggerPath = path.replace(/\/:([a-zA-Z]*)/g, '/{$1}')
      let route = routeDefinitions[method][path]
      if (!route.schema) continue
      if (!paths[swaggerPath]) {
        paths[swaggerPath] = {}
      }
      paths[swaggerPath][method] = {
        operationId: route.operationId || `${swaggerPath}/${method}`,
        tags: route.tags || [],
        summary: route.summary || '',
        description: route.description || '',
        responses: generateResponseDefinitions(route.schema.responses, definitions),
        parameters: generateParams(route.schema.request)
          .concat(generateQueryParams(route.schema.request, definitions))
          .concat(generatePayload(route.schema.request, definitions))
      }
      if (route.tags) {
        for (let tag of route.tags) {
          if (!existingTagsByName[tag]) {
            tags[tag] = true
          }
        }
      }
    }
  }

  return {
    definitions,
    paths,
    tags: Object.keys(tags).map(t => ({ name: t }))
  }
}

const generateSwagger = (routeDefinitions, baseProperties) => {
  const existingTags = baseProperties.tags || []
  const result = generateRoutes(routeDefinitions, existingTags)
  return {
    ...baseProperties,
    openapi: '3.0.3',
    paths: result.paths,
    components: {
      schemas: result.definitions,
      securitySchemes: baseProperties.securityDefinitions || generateSecuritySchemes()
    },
    tags: existingTags.concat(result.tags),
    security: baseProperties.security || [{
      bearerAuth: []
    }, { cookieBased: [] }]
  }
}

module.exports = generateSwagger
