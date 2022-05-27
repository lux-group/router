const { writeFileSync } = require('fs')
const express = require('express')
const generateServerTypes = require('./generate-server-types')

const generateTypes = async (mount, path) => {
  const server = express()
  const router = mount(server)

  const openApiSpec = router.toSwagger()
  if (process.env.DEBUG) console.log(JSON.stringify(openApiSpec, null, 2))

  const output = await generateServerTypes(openApiSpec, {
    formatter (node) {
      if ('format' in node) {
        return node.format
      }
    }
  })
  if (process.env.DEBUG) console.log(output)

  writeFileSync(path, output)
}

module.exports = generateTypes
