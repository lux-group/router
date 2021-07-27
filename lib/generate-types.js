const { writeFileSync } = require('fs')
const express = require('express')
const generateServerTypes = require('openapi-typescript').default

const generateTypes = async (mount, path) => {
  const server = express()
  const router = mount(server)

  const openApiSpec = router.toSwagger()
  if (process.env.DEBUG) console.log(JSON.stringify(openApiSpec, null, 2))

  const output = await generateServerTypes(openApiSpec)
  if (process.env.DEBUG) console.log(output)

  writeFileSync(`${path}/server.ts`, output)
}

module.exports = generateTypes
