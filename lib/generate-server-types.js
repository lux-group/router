const generateTypes = require('openapi-typescript').default

const generateServerTypes = async (openApiSpec) => generateTypes(openApiSpec, {
  formatter (node) {
    // This handles the custom NullOrString matcher that is defined in some services
    if (
      Array.isArray(node.type) &&
      node.type.length === 2 &&
      (
        (node.type[0] === 'null' && node.type[1] === 'string') ||
        (node.type[0] === 'string' && node.type[1] === 'null')
      )
    ) {
      return 'null | string'
    }

    if ('format' in node) {
      if (['ISO8601', 'uuid', 'url'].includes(node.format)) {
        return 'string'
      }
      return node.format
    }
  }
})

module.exports = generateServerTypes
